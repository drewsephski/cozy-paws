export const PLATFORM_FEE_BASIS_POINTS = 300;
export type PaymentStatus = 'OPEN' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'DISPUTED' | 'CHARGEBACK';
export type PaymentState = { requestId: string; connectedAccountId: string; amountCents: number; currency: string; status: PaymentStatus; refundedAmountCents: number; checkoutSessionId: string | null; paymentIntentId: string | null; chargeId: string | null };
export type PaymentSignal = { kind: 'checkout' | 'refund' | 'dispute_created' | 'dispute_closed'; requestId: string; connectedAccountId: string; amountCents: number; currency: string; checkoutSessionId?: string; paymentIntentId?: string; chargeId?: string; refundedAmountCents?: number; disputeOutcome?: 'won' | 'lost' };

export function calculatePlatformFeeCents(amountCents: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 1_000_000) throw new Error('Payment amount must be between 100 and 1000000 cents');
  const fee = Math.round(amountCents * PLATFORM_FEE_BASIS_POINTS / 10_000);
  if (fee <= 0 || fee >= amountCents) throw new Error('Platform fee must be positive and less than the payment amount');
  return fee;
}

export function calculateApplicationFeeRefundTargetCents(fee: number, amount: number, refunded: number) {
  if (![fee, amount, refunded].every(Number.isSafeInteger) || fee <= 0 || fee >= amount || refunded < 0 || refunded > amount) throw new Error('Invalid refund amounts');
  return refunded === amount ? fee : Math.floor(fee * refunded / amount);
}

export function applyPaymentSignal(state: PaymentState, signal: PaymentSignal): PaymentState {
  if (signal.requestId !== state.requestId) throw new Error('Stripe metadata does not match this payment request');
  if (signal.connectedAccountId !== state.connectedAccountId) throw new Error('Stripe connected account does not match this business');
  if (signal.amountCents !== state.amountCents || signal.currency.toLowerCase() !== state.currency) throw new Error('Stripe amount or currency does not match this payment request');
  if (signal.checkoutSessionId && state.checkoutSessionId && signal.checkoutSessionId !== state.checkoutSessionId) throw new Error('Stripe Checkout Session conflicts with the canonical session');
  const next = { ...state, checkoutSessionId: state.checkoutSessionId ?? signal.checkoutSessionId ?? null, paymentIntentId: state.paymentIntentId ?? signal.paymentIntentId ?? null, chargeId: state.chargeId ?? signal.chargeId ?? null };
  if (signal.kind === 'checkout') { if (next.status === 'OPEN') next.status = 'PAID'; return next; }
  if (signal.kind === 'refund') {
    if (signal.refundedAmountCents === undefined || signal.refundedAmountCents < next.refundedAmountCents || signal.refundedAmountCents > next.amountCents) throw new Error('Invalid cumulative refund amount');
    next.refundedAmountCents = signal.refundedAmountCents;
    if (!['DISPUTED', 'CHARGEBACK'].includes(next.status)) next.status = next.refundedAmountCents === next.amountCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    return next;
  }
  if (signal.kind === 'dispute_created') { next.status = 'DISPUTED'; return next; }
  if (signal.disputeOutcome === 'lost') next.status = 'CHARGEBACK';
  else if (signal.disputeOutcome === 'won') next.status = next.refundedAmountCents === next.amountCents ? 'REFUNDED' : next.refundedAmountCents ? 'PARTIALLY_REFUNDED' : 'PAID';
  return next;
}

export function revenueFromPayments(payments: Array<{ id: string; status: PaymentStatus; amountCents: number; refundedAmountCents: number }>) {
  const realized = payments.filter((payment) => ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(payment.status));
  return { successfulPayments: realized.length, grossPaidCents: realized.reduce((sum, payment) => sum + payment.amountCents, 0), generatedRevenueCents: realized.reduce((sum, payment) => sum + payment.amountCents - payment.refundedAmountCents, 0) };
}
