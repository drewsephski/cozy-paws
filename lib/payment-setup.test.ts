import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, statusMock } = vi.hoisted(() => ({ queryMock: vi.fn(), statusMock: vi.fn() }));

vi.mock('./db', () => ({ query: queryMock }));
vi.mock('./connected-accounts', () => ({
  getConnectedAccountStatus: statusMock,
  refreshConnectedAccountReadiness: vi.fn(),
}));

import { getOwnerPaymentSetup, refreshOwnerPaymentSetup } from './payment-requests';

describe('owner Stripe payment setup', () => {
  beforeEach(() => {
    queryMock.mockReset();
    statusMock.mockReset();
  });

  it('refreshes connected accounts from Stripe instead of returning stale database state', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 'business-1', name: 'Phoenix', stripe_account_id: 'acct_1', stripe_ready: false }] });
    statusMock.mockResolvedValue({ status: 'pending', ready: false });

    await expect(getOwnerPaymentSetup('user-1')).resolves.toEqual([{
      businessId: 'business-1',
      businessName: 'Phoenix',
      connected: true,
      status: 'pending',
      ready: false,
    }]);
    expect(statusMock).toHaveBeenCalledWith({ id: 'business-1', stripeAccountId: 'acct_1', stripeReady: false });
  });

  it('refreshes only an authenticated owner business', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 'business-1', name: 'Phoenix', stripe_account_id: 'acct_1', stripe_ready: false }] });
    statusMock.mockResolvedValue({ status: 'ready', ready: true });

    await expect(refreshOwnerPaymentSetup('user-1', 'business-1')).resolves.toEqual({
      businessId: 'business-1',
      businessName: 'Phoenix',
      connected: true,
      status: 'ready',
      ready: true,
    });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('owner_user_id=$2'), ['business-1', 'user-1']);
  });
});
