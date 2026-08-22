import { CreditCard } from 'lucide-react';

export function PublicPaymentSection({ paymentLinkUrl }: { paymentLinkUrl?: string }) {
  if (!paymentLinkUrl) return null;

  return (
    <section className="mt-10 max-w-xl rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-5 dark:bg-emerald-950/20">
      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Make a payment</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Pay securely through Stripe whenever it&apos;s convenient.
      </p>
      <a
        href={paymentLinkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50"
      >
        <CreditCard className="size-4" aria-hidden="true" />
        Make a payment
      </a>
    </section>
  );
}
