import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PublicPaymentSection } from './public-payment-section';

describe('PublicPaymentSection', () => {
  it('is absent until the sitter configures a payment link', () => {
    expect(renderToStaticMarkup(<PublicPaymentSection />)).toBe('');
  });

  it('renders the configured payment link as a secure external action', () => {
    const html = renderToStaticMarkup(
      <PublicPaymentSection paymentLinkUrl="https://buy.stripe.com/test-link" />
    );

    expect(html).toContain('Make a payment');
    expect(html).toContain('href="https://buy.stripe.com/test-link"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
