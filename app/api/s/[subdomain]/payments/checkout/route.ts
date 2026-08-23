import { NextRequest, NextResponse } from 'next/server';
import { createPublicPaymentCheckout, mayCreatePublicPayment } from '@/lib/public-payments';
import { getAppOrigin } from '@/lib/app-url';

export async function POST(request: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  try {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const address = request.headers.get('x-vercel-ip') || request.headers.get('x-real-ip') || forwarded || 'unknown';
    if (!(await mayCreatePublicPayment(subdomain, address))) throw new Error('Please wait before starting another payment.');
    const result = await createPublicPaymentCheckout(subdomain, (await request.formData()).get('amount'));
    return NextResponse.redirect(result.url, 303);
  } catch (error) {
    console.error('Unable to prepare public Stripe Checkout', { subdomain, error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.redirect(`${getAppOrigin()}/s/${encodeURIComponent(subdomain)}?payment=unavailable`, 303);
  }
}
