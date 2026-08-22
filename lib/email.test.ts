import { describe, expect, it } from 'vitest';
import { sendPaymentRequestNotification } from './email';

describe('payment request email', () => {
  it('uses canonical payment data and a payment-request idempotency key', async () => {
    let sent: unknown;
    await sendPaymentRequestNotification({ paymentRequestId: 'request-1', publicToken: 'public-token', businessName: 'Happy Tails', sitterEmail: 'sitter@example.com', customerEmail: 'customer@example.com', description: 'Overnight care', amountCents: 24000, customerNote: 'Please call on arrival' }, async (email) => { sent = email; });
    expect(sent).toMatchObject({ to: 'customer@example.com', replyTo: 'sitter@example.com', subject: 'Payment request from Happy Tails — $240.00', idempotencyKey: 'payment-request/request-1' });
    expect((sent as { text: string }).text).toContain('/pay/public-token');
    expect((sent as { text: string }).text).toContain('Overnight care');
  });
});
