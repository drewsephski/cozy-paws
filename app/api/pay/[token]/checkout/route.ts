import { NextRequest, NextResponse } from 'next/server';
import { createOrReuseCheckoutSession } from '@/lib/checkout';
import { getPaymentRequest } from '@/lib/payment-requests';
import { refreshConnectedAccountReadiness } from '@/lib/connected-accounts';
import { getOrigin } from '@/lib/stripe';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payment = await getPaymentRequest(token);
  if (!payment || payment.status !== 'OPEN' || !payment.stripeAccountId || !(await refreshConnectedAccountReadiness({ id: payment.businessId, stripeAccountId: payment.stripeAccountId, stripeReady: payment.stripeReady }))) return NextResponse.redirect(`${getOrigin()}/pay/${token}?error=unavailable`, 303);
  try { const result = await createOrReuseCheckoutSession(token); return NextResponse.redirect(result.kind === 'paid' ? `${getOrigin()}/pay/${token}/success?session_id=${result.sessionId}` : result.url, 303); }
  catch (error) { console.error('Unable to prepare Stripe Checkout', { paymentRequestId: payment.id, error: error instanceof Error ? error.message : 'Unknown error' }); return NextResponse.redirect(`${getOrigin()}/pay/${token}?error=unavailable`, 303); }
}
