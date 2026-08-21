import type { ProfileOwnership } from './profile-ownership';

export type LeadSubmission = {
  subdomain: unknown;
  name: unknown;
  email: unknown;
  dates: unknown;
  message: unknown;
};

export type LeadRateLimiter = (key: string) => Promise<boolean>;

const readText = (value: unknown, maximumLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maximumLength) : '';

export function createLeadIntake(profiles: ProfileOwnership, maySubmit: LeadRateLimiter) {
  return {
    async submit(input: LeadSubmission, rateLimitKey: string, createdAt = Date.now()) {
      const subdomain = readText(input.subdomain, 30);
      const name = readText(input.name, 120);
      const email = readText(input.email, 160);
      const dates = readText(input.dates, 120);
      const message = readText(input.message, 2000);

      if (!subdomain || !name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
        return { success: false as const, error: 'Please provide your name and a valid email address.' };
      }

      if (!(await maySubmit(rateLimitKey))) {
        return { success: false as const, error: 'Please wait a moment before sending another request.' };
      }

      const savedSubdomain = await profiles.recordLead(subdomain, { name, email, dates, message }, createdAt);
      return savedSubdomain
        ? { success: true as const, subdomain: savedSubdomain }
        : { success: false as const, error: 'This Site is no longer available.' };
    }
  };
}

export type LeadIntake = ReturnType<typeof createLeadIntake>;
