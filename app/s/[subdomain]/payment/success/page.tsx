import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicPaymentResult } from '@/lib/public-payments';

export default async function PublicPaymentSuccessPage({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { subdomain } = await params;
  const { payment } = await searchParams;
  const result = payment ? await getPublicPaymentResult(subdomain, payment) : null;
  if (!result) notFound();
  const confirmed = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(result.status);
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5"><section className="w-full rounded-2xl border bg-card p-7 text-center"><h1 className="text-3xl font-semibold">{confirmed ? 'Payment confirmed' : 'Processing payment…'}</h1><p className="mt-3 text-muted-foreground">{confirmed ? `${result.business_name} received your payment.` : 'We are waiting for Stripe’s signed confirmation. Refresh this page in a moment.'}</p><Link href={`/s/${subdomain}`} className="mt-6 inline-block text-sm font-medium underline underline-offset-4">Return to the sitter’s site</Link></section></main>;
}
