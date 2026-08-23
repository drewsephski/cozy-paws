import { afterEach, describe, expect, it, vi } from 'vitest';

const { parseEventMock, processEventMock } = vi.hoisted(() => ({ parseEventMock: vi.fn(), processEventMock: vi.fn() }));
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ parseEventNotification: parseEventMock }) }));
vi.mock('@/lib/connected-accounts', () => ({ processConnectedAccountStatusEvent: processEventMock }));

import { POST } from './route';

describe('Accounts v2 webhook route', () => {
  afterEach(() => {
    delete process.env.STRIPE_ACCOUNT_WEBHOOK_SECRET;
    parseEventMock.mockReset();
    processEventMock.mockReset();
  });

  it('verifies the signed raw payload before reconciling provider state', async () => {
    process.env.STRIPE_ACCOUNT_WEBHOOK_SECRET = 'whsec_test';
    const event = {
      id: 'evt_1',
      type: 'v2.core.account[requirements].updated',
      related_object: { id: 'acct_1', type: 'v2.core.account' },
    };
    parseEventMock.mockReturnValue(event);

    const response = await POST(new Request('http://localhost/api/stripe/account-events', {
      method: 'POST',
      body: '{"id":"evt_1"}',
      headers: { 'stripe-signature': 'signed' },
    }) as never);

    expect(response.status).toBe(200);
    expect(parseEventMock).toHaveBeenCalledWith('{"id":"evt_1"}', 'signed', 'whsec_test');
    expect(processEventMock).toHaveBeenCalledWith(event);
  });

  it('rejects an invalid signature without touching application state', async () => {
    process.env.STRIPE_ACCOUNT_WEBHOOK_SECRET = 'whsec_test';
    parseEventMock.mockImplementation(() => { throw new Error('bad signature'); });

    const response = await POST(new Request('http://localhost/api/stripe/account-events', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'invalid' },
    }) as never);

    expect(response.status).toBe(400);
    expect(processEventMock).not.toHaveBeenCalled();
  });
});
