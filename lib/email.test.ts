import { describe, expect, it } from 'vitest';
import { sendPasswordResetEmail, sendPaymentRequestNotification } from './email';

describe('password reset email', () => {
  it('sends the single-use reset URL and expiry guidance', async () => {
    let sent: unknown;
    await sendPasswordResetEmail(
      { email: 'sitter@example.com', url: 'https://sitterfolio.com/api/auth/reset-password/token' },
      async (email) => { sent = email; }
    );

    expect(sent).toMatchObject({
      to: 'sitter@example.com',
      subject: 'Reset your Sitterfolio password'
    });
    expect((sent as { text: string }).text).toContain('https://sitterfolio.com/api/auth/reset-password/token');
    expect((sent as { text: string }).text).toContain('expires in 30 minutes');
  });
});

describe('payment request email', () => {
  it('uses canonical payment data and a payment-request idempotency key', async () => {
    let sent: unknown;
    await sendPaymentRequestNotification({ paymentRequestId: 'request-1', publicToken: 'public-token', businessName: 'Happy Tails', sitterEmail: 'sitter@example.com', customerEmail: 'customer@example.com', description: 'Overnight care', amountCents: 24000, customerNote: 'Please call on arrival' }, async (email) => { sent = email; });
    expect(sent).toMatchObject({ to: 'customer@example.com', replyTo: 'sitter@example.com', subject: 'Payment request from Happy Tails — $240.00', idempotencyKey: 'payment-request/request-1' });
    expect((sent as { text: string }).text).toContain('/pay/public-token');
    expect((sent as { text: string }).text).toContain('Overnight care');
  });
});
