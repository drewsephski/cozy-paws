import { CreditCard } from 'lucide-react';

export function PublicPaymentSection({ subdomain, enabled }: { subdomain: string; enabled: boolean }) {
  if (!enabled) return null;

  return (
    <section className="mt-10 max-w-xl rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-5 dark:bg-emerald-950/20">
      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Make a payment</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">Choose the amount, then pay securely through Stripe.</p>
      <form action={`/api/s/${encodeURIComponent(subdomain)}/payments/checkout`} method="post" className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`payment-amount-${subdomain}`} className="sr-only">Payment amount in dollars</label>
        <div className="relative flex-1"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">$</span><input id={`payment-amount-${subdomain}`} name="amount" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" min="1" max="10000" step="0.01" required placeholder="Amount" className="h-12 w-full rounded-xl border border-input bg-background pl-8 pr-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" /></div>
        <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50"><CreditCard className="size-4" aria-hidden="true" />Continue to Stripe</button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">Payments are processed by Stripe for this independent pet-care business.</p>
    </section>
  );
}
