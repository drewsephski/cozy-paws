import type { BusinessCommercialState } from '@/lib/commercial-lifecycle';

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(value);
}

const stateContent = {
  NOT_STARTED: {
    label: 'Not started',
    detail: 'Your trial starts when you publish your first Site.'
  },
  TRIAL: {
    label: 'Trial active',
    detail: 'Your published Sites are covered by this Business trial.'
  },
  TRIAL_ENDED: {
    label: 'Trial ended',
    detail: 'Your 30-day trial period has ended.'
  }
} as const;

export function FoundingPlan({ state }: { state: BusinessCommercialState }) {
  const content = stateContent[state.currentState];

  return (
    <section aria-labelledby={`founding-plan-${state.businessId}`} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-300">30-day Founding trial</p>
          <h2 id={`founding-plan-${state.businessId}`} className="mt-1 text-xl font-semibold">{state.businessName}</h2>
          <p className="mt-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">{content.label}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{content.detail}</p>
        </div>
        <p className="shrink-0 text-2xl font-semibold tracking-tight">$8 per month</p>
      </div>

      {state.trialStartedAt && state.trialEndsAt ? (
        <dl className="mt-5 grid gap-3 rounded-lg bg-background/70 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Trial started</dt><dd className="mt-0.5 font-medium"><time dateTime={state.trialStartedAt.toISOString()}>{formatDate(state.trialStartedAt)}</time></dd></div>
          <div><dt className="text-muted-foreground">Trial ends</dt><dd className="mt-0.5 font-medium"><time dateTime={state.trialEndsAt.toISOString()}>{formatDate(state.trialEndsAt)}</time></dd></div>
        </dl>
      ) : null}

      <div className="mt-5 space-y-2 text-sm leading-6 text-muted-foreground">
        <p>The Founding price is limited to the first 25 paying Businesses. A trial does not reserve a spot.</p>
        <p>Customer payments processed by Sitterfolio have a separate 3% Sitterfolio application fee, plus ordinary Stripe processing costs.</p>
        <p>Sitterfolio is for independently sourced clients. Rover-originated relationships or bookings stay on Rover.</p>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-background/70 px-4 py-3 text-sm">
        <p className="font-medium">Platform payment-method setup {state.paymentMethodEligible ? 'unlocked' : 'locked'}</p>
        <p className="mt-1 text-muted-foreground">{state.paymentMethodEligible
          ? 'Your Business is eligible for the separate Founding subscription setup.'
          : 'Publish your Site before adding a payment method.'}</p>
      </div>
    </section>
  );
}
