import Stripe from 'stripe';
import { protocol, rootDomain } from './utils';

let stripe: Stripe | null = null;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  stripe ??= new Stripe(key);
  return stripe;
}
export function getOrigin() { return process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${rootDomain}`; }
