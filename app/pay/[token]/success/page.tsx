import { notFound } from 'next/navigation';
import { getPaymentRequest } from '@/lib/payment-requests';

export default async function PaymentSuccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const payment = await getPaymentRequest(token); if (!payment) notFound();
  const confirmed = payment.status !== 'OPEN';
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5"><section className="w-full rounded-2xl border bg-card p-7 text-center"><h1 className="text-3xl font-semibold">{confirmed ? 'Payment confirmed' : 'Processing payment…'}</h1><p className="mt-3 text-muted-foreground">{confirmed ? 'Stripe confirmed your payment. Thank you.' : 'We are waiting for Stripe’s signed confirmation. Refresh this page in a moment.'}</p></section></main>;
}
