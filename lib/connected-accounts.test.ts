import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

const { queryMock, retrieveAccountMock } = vi.hoisted(() => ({ queryMock: vi.fn(), retrieveAccountMock: vi.fn() }));
vi.mock('./db', () => ({ query: queryMock }));
vi.mock('./stripe', () => ({ getStripe: () => ({ v2: { core: { accounts: { retrieve: retrieveAccountMock } } } }) }));

import { buildConnectedAccountParams, connectedAccountStatus, isConnectedAccountStatusEvent, processConnectedAccountStatusEvent, statementDescriptorForBusiness } from './connected-accounts';

describe('Stripe connected-account prefill', () => {
  beforeEach(() => {
    queryMock.mockReset();
    retrieveAccountMock.mockReset();
  });
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

  it('reconciles an account event into durable readiness and records the event', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'business-1', stripe_account_id: 'acct_1', stripe_ready: false }] })
      .mockResolvedValue({ rows: [] });
    retrieveAccountMock.mockResolvedValue({
      configuration: { merchant: { capabilities: { card_payments: { status: 'active' } } } },
      requirements: { entries: [] },
    });

    await processConnectedAccountStatusEvent({
      id: 'evt_1',
      type: 'v2.core.account[configuration.merchant].capability_status_updated',
      related_object: { id: 'acct_1', type: 'v2.core.account' },
    });

    expect(retrieveAccountMock).toHaveBeenCalledWith('acct_1', { include: ['configuration.merchant', 'requirements'] });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('update business set stripe_ready'), ['business-1', true]);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('insert into stripe_webhook_event'), ['evt_1', 'v2.core.account[configuration.merchant].capability_status_updated']);
  });
});
