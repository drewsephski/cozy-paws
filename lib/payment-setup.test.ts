import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, statusMock } = vi.hoisted(() => ({ queryMock: vi.fn(), statusMock: vi.fn() }));

vi.mock('./db', () => ({ query: queryMock }));
vi.mock('./connected-accounts', () => ({
  getConnectedAccountStatus: statusMock,
  refreshConnectedAccountReadiness: vi.fn(),
}));

import { getOwnerPaymentSetup, getOwnerRevenue, refreshOwnerPaymentSetup } from './payment-requests';

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

  it('aggregates lifetime payment totals in PostgreSQL without loading payment history', async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('successful_payments')) return { rows: [{ successful_payments: '2', gross_paid_cents: '15000', generated_revenue_cents: '14000' }] };
      if (sql.includes('count(distinct l.id)')) return { rows: [{ inquiries: '4', qualified: '3', requests: '2', booked: '1' }] };
      if (sql.includes('group by source')) return { rows: [{ source: 'referral', generated_revenue_cents: '9000' }] };
      return { rows: [{ subdomain: 'phoenix', generated_revenue_cents: '14000' }] };
    });

    await expect(getOwnerRevenue('user-1')).resolves.toMatchObject({
      successfulPayments: 2,
      grossPaidCents: 15000,
      generatedRevenueCents: 14000,
      inquiries: 4,
      sources: [{ source: 'referral', generatedRevenueCents: 9000 }],
    });

    const totalsSql = queryMock.mock.calls[0][0] as string;
    expect(totalsSql).toContain('count(*) filter');
    expect(totalsSql).not.toContain('select p.id');
    expect(queryMock).toHaveBeenCalledTimes(4);
  });
});
