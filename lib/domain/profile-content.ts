import { z } from 'zod';

export const PROFILE_CONTENT_LIMITS = {
  about: 3_000,
  richText: 1_500,
  serviceName: 80,
  serviceDescription: 1_000,
  startingPrice: 80,
  billingUnit: 80,
  serviceCount: 8,
  serviceDetailsBytes: 12_288
} as const;

export type ServiceProfileDetail = {
  description?: string;
  startingPrice?: string;
  billingUnit?: string;
};

export type ReviewedProfilePatch = {
  sitterName?: string;
  businessName?: string;
  tagline?: string;
  location?: string;
  services?: string[];
  about?: string;
  careRoutine?: string;
  homeEnvironment?: string;
  petPreferences?: string;
  experienceSummary?: string;
  specialCareSummary?: string;
  serviceDetails?: Record<string, ServiceProfileDetail>;
  phone?: string;
  email?: string;
  yearsExperience?: number | null;
  careCapabilities?: string[];
  meetAndGreetExpectations?: string;
  cancellationExpectations?: string;
  selfReportedCredentials?: string[];
  profileImageUrl?: string;
};

const SERVICE_ALIASES: Record<string, string> = {
  boarding: 'Boarding',
  'house sitting': 'House sitting',
  'drop-in visits': 'Drop-in visits',
  'dog walking': 'Dog walking',
  'doggy day care': 'Doggy day care'
};

const containsContact = (value: string) => /(?:https?:\/\/|www\.|\b[^\s@]+@[^\s@]+\.[^\s@]+\b)/i.test(value);

function cleanText(value: unknown, maximum: number, field: string, preserveEmpty: boolean) {
  if (value === undefined) return undefined;
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return preserveEmpty ? '' : undefined;
  if (text.length > maximum) throw new Error(`${field} is too long.`);
  if (containsContact(text)) throw new Error(`${field} cannot include email addresses or web links.`);
  return text;
}

export function normalizeServices(services: readonly string[], limit: number = PROFILE_CONTENT_LIMITS.serviceCount) {
  const seen = new Set<string>();
  return services.flatMap((service) => {
    const cleaned = String(service ?? '').trim().replace(/\s+/g, ' ').slice(0, PROFILE_CONTENT_LIMITS.serviceName);
    const key = cleaned.toLocaleLowerCase('en-US');
    if (!cleaned || seen.has(key)) return [];
    seen.add(key);
    return [SERVICE_ALIASES[key] ?? cleaned];
  }).slice(0, limit);
}

function normalizedDetail(value: unknown, preserveEmpty: boolean): ServiceProfileDetail | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const detail: ServiceProfileDetail = {};
  const description = cleanText(source.description, PROFILE_CONTENT_LIMITS.serviceDescription, 'Service description', preserveEmpty);
  const startingPrice = cleanText(source.startingPrice, PROFILE_CONTENT_LIMITS.startingPrice, 'Starting price', preserveEmpty);
  const billingUnit = cleanText(source.billingUnit, PROFILE_CONTENT_LIMITS.billingUnit, 'Billing unit', preserveEmpty);
  if (description !== undefined) detail.description = description;
  if (startingPrice !== undefined) detail.startingPrice = startingPrice;
  if (billingUnit !== undefined) detail.billingUnit = billingUnit;
  return Object.keys(detail).length ? detail : undefined;
}

function normalizePatch(input: unknown, preserveEmpty: boolean): ReviewedProfilePatch {
  const source = z.record(z.string(), z.unknown()).parse(input);
  const result: ReviewedProfilePatch = {};
  const fields = [
    ['sitterName', 80], ['businessName', 80], ['tagline', 160], ['location', 240],
    ['about', PROFILE_CONTENT_LIMITS.about], ['careRoutine', PROFILE_CONTENT_LIMITS.richText],
    ['homeEnvironment', PROFILE_CONTENT_LIMITS.richText], ['petPreferences', PROFILE_CONTENT_LIMITS.richText],
    ['experienceSummary', PROFILE_CONTENT_LIMITS.richText], ['specialCareSummary', PROFILE_CONTENT_LIMITS.richText],
    ['phone', 40], ['email', 120], ['meetAndGreetExpectations', 500], ['cancellationExpectations', 500]
  ] as const;
  for (const [name, maximum] of fields) {
    const value = cleanText(source[name], maximum, name, preserveEmpty);
    if (value !== undefined) result[name] = value;
  }
  if (source.yearsExperience !== undefined) {
    const years = source.yearsExperience === '' || source.yearsExperience === null ? null : Number(source.yearsExperience);
    if (years !== null && (!Number.isInteger(years) || years < 0 || years > 80)) throw new Error('Years of experience must be from 0 to 80.');
    if (preserveEmpty || years !== null) result.yearsExperience = years;
  }
  if (Array.isArray(source.services)) {
    const services = normalizeServices(source.services.map(String));
    if (preserveEmpty || services.length) result.services = services;
    const details = source.serviceDetails && typeof source.serviceDetails === 'object' && !Array.isArray(source.serviceDetails)
      ? source.serviceDetails as Record<string, unknown>
      : {};
    const normalizedDetails: Record<string, ServiceProfileDetail> = {};
    for (const service of services) {
      const match = Object.entries(details).find(([name]) => name.trim().toLocaleLowerCase('en-US') === service.toLocaleLowerCase('en-US'));
      const detail = normalizedDetail(match?.[1], preserveEmpty);
      if (detail) normalizedDetails[service] = detail;
    }
    if (preserveEmpty || Object.keys(normalizedDetails).length) result.serviceDetails = normalizedDetails;
    if (Buffer.byteLength(JSON.stringify(normalizedDetails), 'utf8') > PROFILE_CONTENT_LIMITS.serviceDetailsBytes) throw new Error('Service details are too large.');
  }
  for (const name of ['careCapabilities', 'selfReportedCredentials'] as const) {
    if (Array.isArray(source[name])) {
      const values = normalizeServices(source[name].map(String), 12);
      if (preserveEmpty || values.length) result[name] = values;
    }
  }
  return result;
}

export function normalizeManualProfilePatch(input: unknown) {
  return normalizePatch(input, true);
}

export function normalizeReviewedProfilePatch(input: unknown) {
  return normalizePatch(input, false);
}
