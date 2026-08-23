import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { processConnectedAccountStatusEvent } from '@/lib/connected-accounts';

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_ACCOUNT_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'Stripe account event verification is not configured' }, { status: 400 });

  let event;
  try {
    event = getStripe().parseEventNotification(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid Stripe account event signature' }, { status: 400 });
  }

  try {
    const relatedObject = 'related_object' in event ? event.related_object : null;
    await processConnectedAccountStatusEvent({ id: event.id, type: event.type, related_object: relatedObject });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe connected-account status reconciliation failed', { eventId: event.id, eventType: event.type, error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: 'Stripe account event reconciliation failed' }, { status: 500 });
  }
}
