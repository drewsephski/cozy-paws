import Stripe from 'stripe';
import { getAppOrigin } from './app-url';

let stripe: Stripe | null = null;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  stripe ??= new Stripe(key);
  return stripe;
}
export const getOrigin = getAppOrigin;
