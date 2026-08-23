import type { LeadIntake } from './lead-intake';

export type AuthenticatedCustomer = { id: string; name: string; email: string };
export type AuthenticatedLeadSubmission = {
  subdomain: string;
  details: unknown;
  submissionToken: unknown;
};

export async function submitAuthenticatedLead(
  customer: AuthenticatedCustomer | null,
  input: AuthenticatedLeadSubmission,
  rateLimitKey: string,
  submit: LeadIntake['submit']
) {
  if (!customer) return { success: false as const, error: 'Sign in to start this conversation.' };
  return submit({
    subdomain: input.subdomain,
    name: customer.name,
    email: customer.email.trim().toLowerCase(),
    dates: '',
    message: input.details,
    submissionToken: input.submissionToken,
    source: 'sitterfolio_account_message'
  }, rateLimitKey);
}
