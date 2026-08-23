'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

function StripeCheckoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />Opening Stripe…</> : <><CreditCard className="size-4" aria-hidden="true" />Continue to Stripe</>}
    </button>
  );
}

export function PublicPaymentSection({ subdomain, enabled, error = false }: { subdomain: string; enabled: boolean; error?: boolean }) {
  if (!enabled) return error ? <p role="alert" className="mt-10 max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">Payments are temporarily unavailable for this business. Please contact the sitter or try again later.</p> : null;

  return (
    <section className="mt-10 max-w-xl rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-5 dark:bg-emerald-950/20">
      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Make a payment</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">Choose the amount, then pay securely through Stripe.</p>
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">We couldn&apos;t open Stripe Checkout. Check the amount or wait a moment, then try again.</p>}
      <form action={`/api/s/${encodeURIComponent(subdomain)}/payments/checkout`} method="post" className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`payment-amount-${subdomain}`} className="sr-only">Payment amount in dollars</label>
        <div className="relative flex-1"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">$</span><input id={`payment-amount-${subdomain}`} name="amount" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" min="1" max="10000" step="0.01" required placeholder="Amount" className="h-12 w-full rounded-xl border border-input bg-background pl-8 pr-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" /></div>
        <StripeCheckoutButton />
      </form>
      <p className="mt-2 text-xs text-muted-foreground">Payments are processed by Stripe for this independent pet-care business.</p>
    </section>
  );
}
