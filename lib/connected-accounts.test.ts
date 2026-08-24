import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

const { queryMock, retrieveAccountMock, createAccountMock, createAccountLinkMock } = vi.hoisted(() => ({ queryMock: vi.fn(), retrieveAccountMock: vi.fn(), createAccountMock: vi.fn(), createAccountLinkMock: vi.fn() }));
vi.mock('./db', () => ({ query: queryMock }));
vi.mock('./stripe', () => ({ getStripe: () => ({ v2: { core: { accounts: { retrieve: retrieveAccountMock, create: createAccountMock }, accountLinks: { create: createAccountLinkMock } } } }) }));

import { buildConnectedAccountParams, connectedAccountStatus, createOrContinueOnboarding, getConnectedAccountStatus, isConnectedAccountStatusEvent, processConnectedAccountStatusEvent, statementDescriptorForBusiness } from './connected-accounts';

describe('Stripe connected-account prefill', () => {
  beforeEach(() => {
    queryMock.mockReset();
    retrieveAccountMock.mockReset();
    createAccountMock.mockReset();
    createAccountLinkMock.mockReset();
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

  it('tells the dashboard to reconnect an account the current platform cannot access', async () => {
    retrieveAccountMock.mockRejectedValue({ type: 'StripePermissionError', code: 'forbidden', statusCode: 403 });

    await expect(getConnectedAccountStatus({
      id: 'business-1',
      stripeAccountId: 'acct_stale',
      stripeReady: false,
    })).resolves.toEqual({ status: 'reconnect_required', ready: false });
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

  it('propagates provider failures without acknowledging the account event', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'business-1', stripe_account_id: 'acct_1', stripe_ready: false }] });
    retrieveAccountMock.mockRejectedValue(new Error('Stripe unavailable'));

    await expect(processConnectedAccountStatusEvent({
      id: 'evt_2',
      type: 'v2.core.account[requirements].updated',
      related_object: { id: 'acct_1', type: 'v2.core.account' },
    })).rejects.toThrow('Stripe unavailable');

    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining('insert into stripe_webhook_event'), expect.anything());
  });

  it('refuses account replacement when either payment aggregate has financial history', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'business-1', name: 'Happy Tails', email: 'sitter@example.com', stripe_account_id: 'acct_old', subdomain: 'happy-tails' }] })
      .mockResolvedValueOnce({ rows: [{ has_history: true }] });
    retrieveAccountMock.mockRejectedValue({ code: 'resource_missing', statusCode: 404 });

    await expect(createOrContinueOnboarding('owner-1', 'business-1')).rejects.toThrow(/payment history/);
    const historySql = queryMock.mock.calls[1][0] as string;
    expect(historySql).toContain('payment_request');
    expect(historySql).toContain('public_payment');
    expect(historySql).toContain('owned.owner_user_id=$2');
    expect(createAccountMock).not.toHaveBeenCalled();
  });
});
