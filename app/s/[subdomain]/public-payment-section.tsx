'use client';

import { CreditCard } from '@/components/ui/animated-icons';
import { useState } from 'react';
import { Spokes } from '@/components/ui/spokes';

function StripeCheckoutButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-semibold text-foreground transition hover:border-emerald-500/60 hover:bg-emerald-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-wait disabled:scale-100 disabled:opacity-70 dark:hover:bg-emerald-950/30"
    >
      {pending ? <><Spokes className="size-4" aria-hidden="true" />Opening Stripe...</> : <><CreditCard className="size-4" aria-hidden="true" />Continue to Stripe</>}
    </button>
  );
}

function PublicPaymentForm({ subdomain }: { subdomain: string }) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={`/api/s/${encodeURIComponent(subdomain)}/payments/checkout`}
      method="post"
      aria-busy={pending}
      onSubmit={() => setPending(true)}
      className="mt-4 flex flex-col gap-3 sm:flex-row"
    >
      <label htmlFor={`payment-amount-${subdomain}`} className="sr-only">Payment amount in dollars</label>
      <div className="relative flex-1"><span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">$</span><input id={`payment-amount-${subdomain}`} name="amount" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" min="1" max="10000" step="0.01" required placeholder="Amount" readOnly={pending} className="h-11 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 read-only:cursor-wait read-only:opacity-70" /></div>
      <StripeCheckoutButton pending={pending} />
    </form>
  );
}

export function PublicPaymentSection({ subdomain, enabled, error = false }: { subdomain: string; enabled: boolean; error?: boolean }) {
  if (!enabled) return error ? <p role="alert" className="mt-10 max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">Payments are temporarily unavailable for this business. Please contact the sitter or try again later.</p> : null;

  return (
    <section className="mt-10 max-w-xl border-t border-border pt-6">
      <p className="text-sm font-semibold">Already received an amount from your sitter?</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">Make a secure payment through Stripe. For new care requests, contact the sitter first.</p>
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">We couldn&apos;t open Stripe Checkout. Check the amount or wait a moment, then try again.</p>}
      <PublicPaymentForm subdomain={subdomain} />
      <p className="mt-2 text-xs text-muted-foreground">Payments are processed by Stripe for this independent pet-care business.</p>
    </section>
  );
}
