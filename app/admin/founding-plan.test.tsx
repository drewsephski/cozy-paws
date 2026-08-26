import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FoundingPlan } from './founding-plan';

describe('Founding plan disclosure', () => {
  it('discloses the commercial offer, trial dates, fees, and direct-client boundary', () => {
    const html = renderToStaticMarkup(<FoundingPlan state={{
      businessId: 'business-1',
      businessName: 'Happy Tails',
      currentState: 'TRIAL',
      trialStartedAt: new Date('2026-08-26T15:00:00.000Z'),
      trialEndsAt: new Date('2026-09-25T15:00:00.000Z'),
      paymentMethodEligible: true
    }} />);

    expect(html).toContain('30-day Founding trial');
    expect(html).toContain('$8 per month');
    expect(html).toContain('first 25 paying Businesses');
    expect(html).toContain('3% Sitterfolio application fee');
    expect(html).toContain('ordinary Stripe processing costs');
    expect(html).toContain('independently sourced clients');
    expect(html).toContain('Rover-originated relationships or bookings stay on Rover');
    expect(html).toContain('August 26, 2026');
    expect(html).toContain('September 25, 2026');
    expect(html).toContain('Trial active');
    expect(html).toContain('Platform payment-method setup unlocked');
  });

  it('keeps payment-method setup unavailable until the Business publishes a Site', () => {
    const html = renderToStaticMarkup(<FoundingPlan state={{
      businessId: 'business-2',
      businessName: 'Draft Care',
      currentState: 'NOT_STARTED',
      trialStartedAt: null,
      trialEndsAt: null,
      paymentMethodEligible: false
    }} />);

    expect(html).toContain('Your trial starts when you publish your first Site.');
    expect(html).toContain('Platform payment-method setup locked');
    expect(html).toContain('Publish your Site before adding a payment method');
  });
});
