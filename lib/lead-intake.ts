import type { ProfileOwnership } from './profile-ownership';

export type LeadSubmission = {
  subdomain: unknown;
  name: unknown;
  email: unknown;
  dates: unknown;
  message: unknown;
};

export type LeadRateLimiter = (key: string) => Promise<boolean>;

const readText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function createLeadIntake(profiles: ProfileOwnership, maySubmit: LeadRateLimiter) {
  return {
    async submit(input: LeadSubmission, rateLimitKey: string, createdAt = Date.now()) {
      const subdomain = readText(input.subdomain);
      const name = readText(input.name);
      const email = readText(input.email);
      const dates = readText(input.dates);
      const message = readText(input.message);

      if (!subdomain || !name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
        return { success: false as const, error: 'Please provide your name and a valid email address.' };
      }

      if (subdomain.length > 30 || name.length > 120 || email.length > 160 || dates.length > 120 || message.length > 2000) {
        return { success: false as const, error: 'Please shorten your request and try again.' };
      }

      if (!(await maySubmit(rateLimitKey))) {
        return { success: false as const, error: 'Please wait a moment before sending another request.' };
      }

      const savedSubdomain = await profiles.recordLead(subdomain, { name, email, dates, message }, createdAt);
      return savedSubdomain
        ? { success: true as const, subdomain: savedSubdomain }
        : { success: false as const, error: 'This site is no longer available.' };
    }
  };
}

export type LeadIntake = ReturnType<typeof createLeadIntake>;
