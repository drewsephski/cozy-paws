export type ActivationDestination =
  | { kind: 'anchor'; href: string }
  | { kind: 'tab'; value: 'dashboard' | 'messages' | 'clients' | 'bookings' };

export type ActivationItem = {
  id: 'site-setup' | 'share-site' | 'connect-stripe' | 'respond-to-inquiry' | 'save-client' | 'create-booking';
  label: string;
  detail: string;
  actionLabel: string;
  complete: boolean;
  actionable: boolean;
  destination: ActivationDestination;
};

type ActivationInput = {
  sites: ReadonlyArray<{ onboardingCompletedAt?: number | null }>;
  leads: ReadonlyArray<{ id: string; status?: string }>;
  conversationMessages: Readonly<Record<string, ReadonlyArray<{ sender: string }>>>;
  paymentSetup: ReadonlyArray<{ status: string }>;
  clientHouseholds: ReadonlyArray<unknown>;
  bookings: ReadonlyArray<unknown>;
};

const handledLeadStatuses = new Set(['QUALIFIED', 'QUOTED', 'BOOKED']);

export function activationChecklist(input: ActivationInput): ActivationItem[] {
  const siteSetupComplete = input.sites.length > 0 && input.sites.every((site) => site.onboardingCompletedAt != null);
  const hasNewInquiry = input.leads.some((lead) => !lead.status || lead.status === 'NEW');
  const hasSitterReply = input.leads.some((lead) => input.conversationMessages[lead.id]?.some((message) => message.sender === 'SITTER'));
  const hasQualifiedLead = input.leads.some((lead) => Boolean(lead.status && handledLeadStatuses.has(lead.status)));
  const stripeRelevant = input.paymentSetup.length > 0;
  const stripeReady = stripeRelevant && input.paymentSetup.every((business) => business.status === 'ready');

  return [
    {
      id: 'site-setup',
      label: 'Set up your site',
      detail: siteSetupComplete ? 'Your profile is ready to share.' : 'Finish the basics pet owners need to understand your care.',
      actionLabel: siteSetupComplete ? 'View site links' : 'Finish setup',
      complete: siteSetupComplete,
      actionable: !siteSetupComplete,
      destination: { kind: 'anchor', href: siteSetupComplete ? '#share-site' : '#site-editor' }
    },
    {
      id: 'share-site',
      label: 'Share your site',
      detail: 'Send your live site to a first client or add it to your existing profile links.',
      actionLabel: 'Open site links',
      complete: false,
      actionable: true,
      destination: { kind: 'anchor', href: '#share-site' }
    },
    ...(stripeRelevant ? [{
      id: 'connect-stripe' as const,
      label: 'Connect Stripe',
      detail: stripeReady ? 'Stripe is marked ready for payment requests.' : 'Connect Stripe before you ask a pet owner to pay.',
      actionLabel: stripeReady ? 'Review Stripe status' : 'Connect Stripe',
      complete: stripeReady,
      actionable: !stripeReady,
      destination: { kind: 'anchor' as const, href: '#stripe-setup' }
    }] : []),
    {
      id: 'respond-to-inquiry',
      label: 'Respond to a new inquiry',
      detail: hasSitterReply ? 'You have replied to a pet owner from the inbox.' : hasNewInquiry ? 'Review the newest request and reply while it is fresh.' : 'Your first request will appear here when a pet owner reaches out.',
      actionLabel: hasNewInquiry ? 'Review requests' : 'Open requests',
      complete: hasSitterReply,
      actionable: hasNewInquiry && !hasSitterReply,
      destination: { kind: 'anchor', href: '#requests' }
    },
    {
      id: 'save-client',
      label: 'Save a qualified client',
      detail: input.clientHouseholds.length > 0 ? 'Your client household and pet details are saved for follow-up.' : hasQualifiedLead ? 'Save a qualified inquiry so the household and pets are ready for repeat care.' : 'Qualify an inquiry first, then save the household for future care.',
      actionLabel: hasQualifiedLead && input.clientHouseholds.length === 0 ? 'Review qualified inquiry' : 'Open requests',
      complete: input.clientHouseholds.length > 0,
      actionable: hasQualifiedLead && input.clientHouseholds.length === 0,
      destination: { kind: 'anchor', href: '#requests' }
    },
    {
      id: 'create-booking',
      label: 'Create a first draft booking',
      detail: input.bookings.length > 0 ? 'Your booking workspace is ready for dates, pets, and agreed amounts.' : 'Turn a saved client into a dated draft you can review before confirming care.',
      actionLabel: input.clientHouseholds.length > 0 ? 'Open bookings' : 'Save a client first',
      complete: input.bookings.length > 0,
      actionable: input.clientHouseholds.length > 0 && input.bookings.length === 0,
      destination: { kind: 'tab', value: 'bookings' }
    }
  ];
}

export function nextActivationItem(items: ReadonlyArray<ActivationItem>) {
  const priority = ['site-setup', 'respond-to-inquiry', 'connect-stripe', 'save-client', 'create-booking', 'share-site'];
  return priority.map((id) => items.find((item) => item.id === id && !item.complete && item.actionable)).find(Boolean) ?? null;
}
