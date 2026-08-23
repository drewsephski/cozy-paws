import { describe, expect, it } from 'vitest';
import { sendConversationMessageNotification, sendPasswordResetEmail, sendPaymentRequestNotification } from './email';

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
    expect((sent as { html: string }).html).toContain('Reset my password');
    expect((sent as { html: string }).html).toContain('For your security:');
    expect((sent as { html: string }).html).toContain('expires in 30 minutes');
  });

  it('escapes the reset URL before interpolating it into HTML', async () => {
    let sent: unknown;
    await sendPasswordResetEmail(
      { email: 'sitter@example.com', url: 'https://sitterfolio.com/reset?token=a&next=\"unsafe\"' },
      async (email) => { sent = email; }
    );

    const html = (sent as { html: string }).html;
    expect(html).toContain('token=a&amp;next=&quot;unsafe&quot;');
    expect(html).not.toContain('next=\"unsafe\"');
  });
});

describe('payment request email', () => {
  it('uses canonical payment data and a payment-request idempotency key', async () => {
    let sent: unknown;
    await sendPaymentRequestNotification({ paymentRequestId: 'request-1', publicToken: 'public-token', businessName: 'Happy Tails', sitterEmail: 'sitter@example.com', customerEmail: 'customer@example.com', description: 'Overnight care', amountCents: 24000, customerNote: 'Please call on arrival' }, async (email) => { sent = email; });
    expect(sent).toMatchObject({ to: 'customer@example.com', replyTo: 'sitter@example.com', subject: 'Payment request from Happy Tails — $240.00', idempotencyKey: 'payment-request/request-1' });
    expect((sent as { text: string }).text).toContain('/pay/public-token');
    expect((sent as { text: string }).text).toContain('Overnight care');
    expect((sent as { html: string }).html).toContain('Payment request for $240.00');
    expect((sent as { html: string }).html).toContain('Pay $240.00');
    expect((sent as { html: string }).html).toContain('Please call on arrival');
  });
});

describe('conversation message email', () => {
  it('returns the recipient to the private conversation with an idempotent notification', async () => {
    let sent: unknown;
    await sendConversationMessageNotification({ messageId: 'message-1', conversationToken: 'private-token', recipientEmail: 'customer@example.com', replyTo: 'sitter@example.com', senderName: 'Happy Tails', preview: 'Those dates work.' }, async (email) => { sent = email; });

    expect(sent).toMatchObject({ to: 'customer@example.com', replyTo: 'sitter@example.com', subject: 'New message from Happy Tails', idempotencyKey: 'conversation-message/message-1' });
    expect((sent as { text: string }).text).toContain('/conversation/private-token');
    expect((sent as { text: string }).text).toContain('Those dates work.');
    expect((sent as { html: string }).html).toContain('View and reply');
    expect((sent as { html: string }).html).toContain('/conversation/private-token');
  });

  it('escapes sender and message content in HTML', async () => {
    let sent: unknown;
    await sendConversationMessageNotification({ messageId: 'message-2', conversationToken: 'private-token', recipientEmail: 'customer@example.com', senderName: 'Happy <Tails>', preview: 'Meet at 5 & bring treats?' }, async (email) => { sent = email; });

    const html = (sent as { html: string }).html;
    expect(html).toContain('Happy &lt;Tails&gt;');
    expect(html).toContain('Meet at 5 &amp; bring treats?');
    expect(html).not.toContain('Happy <Tails>');
  });
});
