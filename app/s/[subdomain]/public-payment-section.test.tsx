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

    expect(html).toContain('Already received an amount from your sitter?');
    expect(html).toContain('name="amount"');
    expect(html).toContain('action="/api/s/happy-tails/payments/checkout"');
    expect(html).toContain('Make a secure payment through Stripe');
    expect(html).toContain('Continue to Stripe');
    expect(html).toContain('type="submit"');
  });

  it('explains when Stripe Checkout could not be opened', () => {
    const html = renderToStaticMarkup(<PublicPaymentSection subdomain="happy-tails" enabled error />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('try again');
  });

  it('keeps the error visible if Stripe readiness changed', () => {
    const html = renderToStaticMarkup(<PublicPaymentSection subdomain="happy-tails" enabled={false} error />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('temporarily unavailable');
  });
});
