export const leadStatuses = ['NEW', 'QUALIFIED', 'QUOTED', 'BOOKED', 'DECLINED', 'SPAM'] as const;
export type LeadStatus = typeof leadStatuses[number];
export function parseLeadStatus(value: unknown): LeadStatus | null { return typeof value === 'string' && leadStatuses.includes(value as LeadStatus) ? value as LeadStatus : null; }

const transitions: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ['QUALIFIED', 'DECLINED', 'SPAM'],
  QUALIFIED: ['QUOTED', 'DECLINED', 'SPAM'],
  QUOTED: ['BOOKED', 'DECLINED'],
  BOOKED: [], DECLINED: ['NEW'], SPAM: ['NEW']
};

export function canTransitionLead(from: LeadStatus, to: LeadStatus) {
  return from === to || transitions[from].includes(to);
}
export const canRequestPayment = (status: LeadStatus | undefined) => status === 'QUALIFIED' || status === 'QUOTED';
export const canSaveClientFromLead = (status: LeadStatus | undefined) => status === 'QUALIFIED' || status === 'QUOTED' || status === 'BOOKED';
export const canReopenLead = (status: LeadStatus | undefined) => status === 'DECLINED' || status === 'SPAM';

export const leadEventForStatus = (status: LeadStatus) => status === 'QUALIFIED' ? 'QUALIFIED' : status === 'DECLINED' ? 'DECLINED' : status === 'SPAM' ? 'SPAM' : null;

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const date = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(value)) ? text(value) : null;

export type QualifiedLeadInput = {
  name: string; email: string; serviceRequested: string; requestedStartDate: string | null;
  requestedEndDate: string | null; dateDetails: string; petTypes: string[]; petCount: number | null;
  postalCode: string; careDetails: string; source: string; campaign: string | null;
};

export function parseLeadSubmission(input: Record<string, unknown>): { success: true; data: QualifiedLeadInput } | { success: false; error: string } {
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  const start = date(input.startDate);
  const end = date(input.endDate);
  const countText = text(input.petCount);
  const petCount = countText ? Number(countText) : null;
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { success: false, error: 'Please provide your name and a valid email address.' };
  if (text(input.startDate) && !start || text(input.endDate) && !end || start && end && end < start) return { success: false, error: 'Please provide a valid date range.' };
  if (petCount !== null && (!Number.isSafeInteger(petCount) || petCount < 1 || petCount > 50)) return { success: false, error: 'Please provide a valid number of pets.' };
  const data: QualifiedLeadInput = {
    name, email, serviceRequested: text(input.service).slice(0, 120), requestedStartDate: start,
    requestedEndDate: end, dateDetails: text(input.dates).slice(0, 120),
    petTypes: text(input.petTypes).split(',').map((value) => value.trim()).filter(Boolean).slice(0, 8),
    petCount, postalCode: text(input.postalCode).slice(0, 20), careDetails: text(input.details ?? input.message).slice(0, 2000),
    source: text(input.source).slice(0, 80) || 'direct', campaign: text(input.campaign).slice(0, 120) || null
  };
  if ([data.serviceRequested, data.dateDetails, data.postalCode].some((value) => value.length > 240)) return { success: false, error: 'Please shorten your request and try again.' };
  return { success: true, data };
}
