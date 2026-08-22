import type { ProfileOwnership } from './profile-ownership';
import { parseLeadSubmission } from './domain/leads';

export type LeadSubmission = {
  subdomain: unknown;
  name: unknown;
  email: unknown;
  dates: unknown;
  message: unknown;
  service?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  petTypes?: unknown;
  petCount?: unknown;
  postalCode?: unknown;
  source?: unknown;
  campaign?: unknown;
};

export type LeadRateLimiter = (key: string) => Promise<boolean>;
export type AcceptedLead = {
  subdomain: string;
  profile: Awaited<ReturnType<ProfileOwnership['get']>>;
  lead: import('./profile-ownership').Lead;
};
export type LeadNotifier = (accepted: AcceptedLead) => Promise<void>;

const readText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function createLeadIntake(profiles: ProfileOwnership, maySubmit: LeadRateLimiter, notify?: LeadNotifier) {
  return {
    async submit(input: LeadSubmission, rateLimitKey: string, createdAt = Date.now()) {
      const subdomain = readText(input.subdomain);
      if (subdomain.length > 30 || readText(input.name).length > 120 || readText(input.email).length > 160 || readText(input.dates).length > 120 || readText(input.message).length > 2000) {
        return { success: false as const, error: 'Please shorten your request and try again.' };
      }
      const parsed = parseLeadSubmission(input);
      if (!subdomain || !parsed.success) return { success: false as const, error: parsed.success ? 'This site is no longer available.' : parsed.error };

      if (!(await maySubmit(rateLimitKey))) {
        return { success: false as const, error: 'Please wait a moment before sending another request.' };
      }

      const lead = parsed.data;
      const saved = await profiles.recordLead(subdomain, {
        name: lead.name, email: lead.email, dates: lead.dateDetails, message: lead.careDetails,
        serviceRequested: lead.serviceRequested, requestedStartDate: lead.requestedStartDate,
        requestedEndDate: lead.requestedEndDate, petTypes: lead.petTypes, petCount: lead.petCount,
        postalCode: lead.postalCode, source: lead.source, campaign: lead.campaign, status: 'NEW'
      }, createdAt);
      if (!saved) return { success: false as const, error: 'This site is no longer available.' };
      if (notify) {
        try { await notify(saved); } catch (error) {
          console.error(JSON.stringify({ event: 'new_lead_notification_failed', reason: error instanceof Error ? error.name : 'unknown' }));
        }
      }
      return { success: true as const, subdomain: saved.subdomain };
    }
  };
}

export type LeadIntake = ReturnType<typeof createLeadIntake>;
