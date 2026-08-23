import { notFound } from 'next/navigation';
import { PaymentResultCard } from '@/components/payment-result-card';
import { getPaymentRequest } from '@/lib/payment-requests';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata;

export default async function PaymentSuccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const payment = await getPaymentRequest(token); if (!payment) notFound();
  const confirmed = payment.status !== 'OPEN';
  return <PaymentResultCard confirmed={confirmed} message={confirmed ? 'Stripe confirmed your payment. Thank you.' : "We are waiting for Stripe's signed confirmation. Refresh this page in a moment."} />;
}
