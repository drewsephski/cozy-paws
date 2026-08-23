import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { buildConnectedAccountParams, connectedAccountStatus, isConnectedAccountStatusEvent, statementDescriptorForBusiness } from './connected-accounts';

describe('Stripe connected-account prefill', () => {
  it('classifies pet-care businesses before hosted onboarding', () => {
    const params = buildConnectedAccountParams({
      id: 'business-1',
      name: 'Cozy Paws',
      email: 'sitter@example.com',
      subdomain: 'cozy-paws',
    });

    expect(params.configuration?.merchant?.mcc).toBe('7299');
    expect(params.configuration?.merchant?.statement_descriptor).toEqual({ descriptor: 'COZY PAWS', prefix: 'COZY PAWS' });
    expect(params.defaults?.profile?.business_url).toContain('cozy-paws.');
    expect(params.defaults?.profile?.product_description).toBe('Independent pet sitting and pet-care services.');
  });

  it('builds Stripe-safe descriptors from the sitter business name', () => {
    expect(statementDescriptorForBusiness(`Léa's <Happy> Paws & Walks`)).toEqual({
      descriptor: 'LEA S HAPPY PAWS WALKS',
      prefix: 'LEA S HAPP',
    });
    expect(statementDescriptorForBusiness('P')).toEqual({ descriptor: 'P PET CARE', prefix: 'P PET CARE' });
  });

  it('distinguishes review from user action and payment readiness', () => {
    const account = (status: 'active' | 'pending' | 'restricted', awaiting?: 'stripe' | 'user') => ({
      configuration: { merchant: { capabilities: { card_payments: { status } } } },
      requirements: { entries: awaiting ? [{ awaiting_action_from: awaiting }] : [] },
    }) as unknown as Stripe.V2.Core.Account;

    expect(connectedAccountStatus(account('active'))).toBe('ready');
    expect(connectedAccountStatus(account('active', 'user'))).toBe('action_required');
    expect(connectedAccountStatus(account('pending', 'stripe'))).toBe('pending');
    expect(connectedAccountStatus(account('restricted', 'user'))).toBe('action_required');
  });

  it('accepts only the Accounts v2 events that can change payment readiness', () => {
    expect(isConnectedAccountStatusEvent('v2.core.account[requirements].updated')).toBe(true);
    expect(isConnectedAccountStatusEvent('v2.core.account[configuration.merchant].capability_status_updated')).toBe(true);
    expect(isConnectedAccountStatusEvent('v2.core.account[identity].updated')).toBe(false);
  });
});
