import Stripe from 'stripe';

export function checkoutEventOutcome(type: string, session: Pick<Stripe.Checkout.Session, 'status' | 'payment_status'>): 'paid' | 'pending' | 'failed' {
  if (session.status !== 'complete') throw new Error('Checkout Session is not complete');
  if (type === 'checkout.session.async_payment_failed') return 'failed';
  if (session.payment_status === 'paid') return 'paid';
  if (type === 'checkout.session.completed' && session.payment_status === 'unpaid') return 'pending';
  throw new Error('Checkout Session payment state is inconsistent with its event');
}
