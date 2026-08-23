import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PublicPaymentSection } from './public-payment-section';

describe('PublicPaymentSection', () => {
  it('is absent until the sitter can accept Stripe payments', () => {
    expect(renderToStaticMarkup(<PublicPaymentSection subdomain="happy-tails" enabled={false} />)).toBe('');
  });

  it('lets a customer choose an amount without the sitter creating a product', () => {
    const html = renderToStaticMarkup(
      <PublicPaymentSection subdomain="happy-tails" enabled />
    );

    expect(html).toContain('Make a payment');
    expect(html).toContain('name="amount"');
    expect(html).toContain('action="/api/s/happy-tails/payments/checkout"');
    expect(html).toContain('Choose the amount');
  });
});
