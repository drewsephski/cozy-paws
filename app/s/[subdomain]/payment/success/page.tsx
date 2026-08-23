import { notFound } from 'next/navigation';
import { PaymentResultCard } from '@/components/payment-result-card';
import { getPublicPaymentResult } from '@/lib/public-payments';

export default async function PublicPaymentSuccessPage({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { subdomain } = await params;
  const { payment } = await searchParams;
  const result = payment ? await getPublicPaymentResult(subdomain, payment) : null;
  if (!result) notFound();
  const confirmed = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(result.status);
  return <PaymentResultCard confirmed={confirmed} message={confirmed ? `${result.business_name} received your payment.` : 'We are waiting for Stripe’s signed confirmation. Refresh this page in a moment.'} returnHref={`/s/${subdomain}`} />;
}
