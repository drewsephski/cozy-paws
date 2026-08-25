'use client';

import { canonicalizeRoverProfileUrl } from '@/lib/domain/rover-profile-url';

const DB_NAME = 'sitterfolio-import-drafts';
const STORE = 'reviews';
const REVIEW_TTL_MS = 30 * 60_000;
const FORBIDDEN = new Set(['screenshot', 'screenshots', 'slices', 'prompt', 'rawModelResponse', 'visibleEvidence', 'providerKey', 'authenticationToken', 'roverAssetUrl']);
const CONFIDENCE = new Set(['high', 'medium']);
const PATCH_TEXT_LIMITS = {
  sitterName: 80,
  businessName: 80,
  tagline: 160,
  location: 240,
  about: 3_000,
  careRoutine: 1_500,
  homeEnvironment: 1_500,
  petPreferences: 1_500,
  experienceSummary: 1_500,
  specialCareSummary: 1_500,
  phone: 40,
  email: 120,
  meetAndGreetExpectations: 500,
  cancellationExpectations: 500
} as const;
const PATCH_ARRAY_LIMITS = { services: 8, careCapabilities: 12, selfReportedCredentials: 12 } as const;
const PATCH_KEYS = new Set([...Object.keys(PATCH_TEXT_LIMITS), ...Object.keys(PATCH_ARRAY_LIMITS), 'yearsExperience', 'serviceDetails']);
const REVIEW_KEYS = new Set([
  'attemptId', 'subdomain', 'expiresAt', 'expectedProfileRevision', 'canonicalRoverUrl', 'current', 'reviewed',
  'confidence', 'serviceConfidence', 'applyId'
]);

export type StoredRoverReview = {
  attemptId: string;
  subdomain: string;
  expiresAt: number;
  reviewed: Record<string, unknown>;
  [key: string]: unknown;
};

export const reviewKey = (subdomain: string, attemptId: string) => `rover-profile-review:${subdomain}:${attemptId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function normalizeStringArray(value: unknown, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const output: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string' || item.length > 80 || seen.has(item)) return null;
    seen.add(item);
    output.push(item);
  }
  return output;
}

function normalizeProfilePatch(value: unknown) {
  if (!isRecord(value) || !hasOnlyKeys(value, PATCH_KEYS)) return null;
  const output: Record<string, unknown> = {};
  for (const [name, maximum] of Object.entries(PATCH_TEXT_LIMITS)) {
    const field = value[name];
    if (field === undefined) continue;
    if (typeof field !== 'string' || field.length > maximum) return null;
    output[name] = field;
  }
  for (const [name, maximum] of Object.entries(PATCH_ARRAY_LIMITS)) {
    const field = value[name];
    if (field === undefined) continue;
    const normalized = normalizeStringArray(field, maximum);
    if (!normalized) return null;
    output[name] = normalized;
  }
  if (value.yearsExperience !== undefined) {
    if (value.yearsExperience !== null && (!Number.isSafeInteger(value.yearsExperience) || Number(value.yearsExperience) < 0 || Number(value.yearsExperience) > 80)) return null;
    output.yearsExperience = value.yearsExperience;
  }
  if (value.serviceDetails !== undefined) {
    if (!isRecord(value.serviceDetails)) return null;
    const services = output.services;
    if (!Array.isArray(services) || Object.keys(value.serviceDetails).length > 8) return null;
    const serviceNames = new Set(services);
    const details: Record<string, Record<string, string>> = {};
    for (const [service, rawDetail] of Object.entries(value.serviceDetails)) {
      if (!serviceNames.has(service) || !isRecord(rawDetail) || !hasOnlyKeys(rawDetail, new Set(['description', 'startingPrice', 'billingUnit']))) return null;
      const detail: Record<string, string> = {};
      for (const [name, maximum] of Object.entries({ description: 1_000, startingPrice: 80, billingUnit: 80 })) {
        const field = rawDetail[name];
        if (field === undefined) continue;
        if (typeof field !== 'string' || field.length > maximum) return null;
        detail[name] = field;
      }
      details[service] = detail;
    }
    if (new TextEncoder().encode(JSON.stringify(details)).byteLength > 12_288) return null;
    output.serviceDetails = details;
  }
  return output;
}

function normalizeConfidence(value: unknown, reviewed: Record<string, unknown>) {
  if (!isRecord(value) || !Object.keys(value).every((name) => PATCH_KEYS.has(name) && name in reviewed)) return null;
  const output: Record<string, 'high' | 'medium'> = {};
  for (const [name, confidence] of Object.entries(value)) {
    if (typeof confidence !== 'string' || !CONFIDENCE.has(confidence)) return null;
    output[name] = confidence as 'high' | 'medium';
  }
  return output;
}

function normalizeServiceConfidence(value: unknown, reviewed: Record<string, unknown>) {
  if (value === undefined) return undefined;
  if (!isRecord(value) || Object.keys(value).length > 8) return null;
  const services = Array.isArray(reviewed.services) ? new Set(reviewed.services) : new Set<string>();
  const output: Record<string, Record<string, 'high' | 'medium'>> = {};
  const allowed = new Set(['name', 'description', 'startingPrice', 'billingUnit']);
  for (const [service, rawConfidence] of Object.entries(value)) {
    if (!services.has(service) || !isRecord(rawConfidence) || !hasOnlyKeys(rawConfidence, allowed)) return null;
    const detail: Record<string, 'high' | 'medium'> = {};
    for (const [name, confidence] of Object.entries(rawConfidence)) {
      if (typeof confidence !== 'string' || !CONFIDENCE.has(confidence)) return null;
      detail[name] = confidence as 'high' | 'medium';
    }
    output[service] = detail;
  }
  return output;
}

/** Retain review fields only while their exact service name remains selected. */
type RoverServiceConfidence = Partial<Record<'name' | 'description' | 'startingPrice' | 'billingUnit', 'high' | 'medium'>>;

export function synchronizeRoverReviewServices(
  services: string[],
  serviceDetails: Record<string, Record<string, string>> | undefined,
  serviceConfidence: Record<string, RoverServiceConfidence> | undefined
) {
  const selectedServices = new Set(services);
  const retainSelected = <T>(value: Record<string, T> | undefined) => value === undefined
    ? undefined
    : Object.fromEntries(Object.entries(value).filter(([service]) => selectedServices.has(service)));

  return {
    serviceDetails: retainSelected(serviceDetails),
    serviceConfidence: retainSelected(serviceConfidence)
  };
}

export function normalizeRestorableRoverReview(value: unknown, expectedSubdomain: string, key: string, now = Date.now()): StoredRoverReview | null {
  try {
    if (!isRecord(value) || !hasOnlyKeys(value, REVIEW_KEYS)) return null;
    assertSafe(value);
    if (
      typeof value.attemptId !== 'string' || !UUID.test(value.attemptId)
      || typeof value.subdomain !== 'string' || value.subdomain !== expectedSubdomain
      || key !== reviewKey(value.subdomain, value.attemptId)
      || !Number.isSafeInteger(value.expiresAt) || Number(value.expiresAt) <= now || Number(value.expiresAt) > now + REVIEW_TTL_MS
      || !Number.isSafeInteger(value.expectedProfileRevision) || Number(value.expectedProfileRevision) < 0
      || typeof value.canonicalRoverUrl !== 'string' || canonicalizeRoverProfileUrl(value.canonicalRoverUrl) !== value.canonicalRoverUrl
      || (value.applyId !== undefined && (typeof value.applyId !== 'string' || !UUID.test(value.applyId)))
    ) return null;
    const current = normalizeProfilePatch(value.current);
    const reviewed = normalizeProfilePatch(value.reviewed);
    if (!current || !reviewed) return null;
    const confidence = normalizeConfidence(value.confidence, reviewed);
    const serviceConfidence = normalizeServiceConfidence(value.serviceConfidence, reviewed);
    if (!confidence || serviceConfidence === null) return null;
    return {
      attemptId: value.attemptId,
      subdomain: value.subdomain,
      expiresAt: Number(value.expiresAt),
      expectedProfileRevision: Number(value.expectedProfileRevision),
      canonicalRoverUrl: value.canonicalRoverUrl,
      current,
      reviewed,
      confidence,
      ...(serviceConfidence === undefined ? {} : { serviceConfidence }),
      ...(value.applyId === undefined ? {} : { applyId: value.applyId })
    };
  } catch {
    return null;
  }
}

export function isRestorableRoverReview(value: unknown, expectedSubdomain: string, key: string, now = Date.now()) {
  return normalizeRestorableRoverReview(value, expectedSubdomain, key, now) !== null;
}

function assertSafe(value: unknown, key = ''): void {
  if (FORBIDDEN.has(key)) throw new Error('Import review contains forbidden provider artifacts.');
  if (!value || typeof value !== 'object' || value instanceof Blob || value instanceof ArrayBuffer || value instanceof Uint8Array) return;
  for (const [childKey, child] of Object.entries(value)) assertSafe(child, childKey);
}

type Adapter = { get(key: string): Promise<StoredRoverReview | null>; put(key: string, value: StoredRoverReview): Promise<void>; delete(key: string): Promise<void>; entries(): Promise<Array<[string, StoredRoverReview]>> };

export function createReviewStore(adapter: Adapter, now = Date.now) {
  return {
    async save(draft: StoredRoverReview) { assertSafe(draft); await adapter.put(reviewKey(draft.subdomain, draft.attemptId), draft); },
    async load(key: string) { const value = await adapter.get(key); if (!value) return null; if (value.expiresAt <= now()) { await adapter.delete(key); return null; } return value; },
    remove: (key: string) => adapter.delete(key),
    async sweep() { for (const [key, value] of await adapter.entries()) if (value.expiresAt <= now()) await adapter.delete(key); }
  };
}

export type ReviewStore = ReturnType<typeof createReviewStore>;

export async function loadRestorableRoverReview(store: ReviewStore, key: string, expectedSubdomain: string, now = Date.now()) {
  const stored = await store.load(key);
  if (!stored) return { review: null, discarded: false } as const;
  const review = normalizeRestorableRoverReview(stored, expectedSubdomain, key, now);
  if (review) return { review, discarded: false } as const;
  await store.remove(key);
  return { review: null, discarded: true } as const;
}

export function createReviewDraftPersistence(store: ReviewStore) {
  let pending: Promise<void> = Promise.resolve();
  return {
    save(draft: StoredRoverReview) {
      const operation = pending.catch(() => {}).then(() => store.save(draft));
      pending = operation;
      return operation;
    },
    async remove(key: string) {
      await pending.catch(() => {});
      await store.remove(key);
    }
  };
}

export function createMemoryReviewStore(now = Date.now) {
  const values = new Map<string, StoredRoverReview>();
  return createReviewStore({
    async get(key) { return values.get(key) ?? null; },
    async put(key, value) { values.set(key, value); },
    async delete(key) { values.delete(key); },
    async entries() { return [...values.entries()]; }
  }, now);
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function request<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const result = operation(transaction.objectStore(STORE));
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error);
    });
  } finally { db.close(); }
}

export function createBrowserReviewStore() {
  return createReviewStore({
    async get(key) { return (await request('readonly', (store) => store.get(key))) ?? null; },
    async put(key, value) { await request('readwrite', (store) => store.put(value, key)); },
    async delete(key) { await request('readwrite', (store) => store.delete(key)); },
    async entries() {
      const db = await openDatabase();
      try { return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readonly');
        const store = transaction.objectStore(STORE);
        const output: Array<[string, StoredRoverReview]> = [];
        const cursor = store.openCursor();
        cursor.onsuccess = () => { const item = cursor.result; if (!item) { resolve(output); return; } output.push([String(item.key), item.value]); item.continue(); };
        cursor.onerror = () => reject(cursor.error);
      }); } finally { db.close(); }
    }
  });
}
