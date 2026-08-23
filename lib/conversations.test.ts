import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, transactionMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  transactionMock: vi.fn()
}));
vi.mock('./db', () => ({
  query: queryMock,
  transaction: transactionMock
}));

import {
  createLeadConversation,
  getCustomerConversation,
  sendCustomerConversationMessage,
  sendSitterConversationMessage
} from './conversations';

describe('Lead conversations', () => {
  beforeEach(() => {
    queryMock.mockReset();
    transactionMock.mockReset();
  });

  it('creates one secure conversation link for a persisted Lead', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ public_token: 'existing-token' }] });

    await expect(createLeadConversation('lead-1')).resolves.toBe('existing-token');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('insert into lead_conversation'), [
      'lead-1',
      expect.stringMatching(/^[A-Za-z0-9_-]{32,}$/)
    ]);
  });

  it('returns the Lead and ordered messages only for the customer bearer token', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ lead_id: 'lead-1', customer_name: 'Sam', customer_email: 'sam@example.com', care_details: 'Two dogs', service_requested: 'Overnight care', requested_start_date: '2026-09-15', requested_end_date: '2026-09-17', created_at: new Date('2026-08-23T12:00:00Z'), sitter_name: 'Drew', business_name: 'The Pet Nanny', subdomain: 'drews' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'message-1', sender: 'SITTER', body: 'Those dates work.', created_at: new Date('2026-08-23T13:00:00Z') }] });

    const conversation = await getCustomerConversation('valid-token');

    expect(conversation?.leadId).toBe('lead-1');
    expect(conversation?.messages).toEqual([
      expect.objectContaining({ sender: 'CUSTOMER', body: 'Two dogs' }),
      expect.objectContaining({ sender: 'SITTER', body: 'Those dates work.' })
    ]);
    expect(queryMock.mock.calls[0][1]).toEqual(['valid-token']);
  });

  it('rejects blank customer messages and requires a matching conversation token', async () => {
    await expect(sendCustomerConversationMessage('token', '   ')).rejects.toThrow('Write a message');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('authorizes sitter replies through Business ownership', async () => {
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ public_token: 'customer-token', customer_email: 'sam@example.com', business_name: 'The Pet Nanny', sitter_email: 'drew@example.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'message-2' }] }) };
    transactionMock.mockImplementation((work) => work(client));

    await expect(sendSitterConversationMessage('owner-1', 'lead-1', 'Those dates work.')).resolves.toMatchObject({
      id: 'message-2',
      publicToken: 'customer-token'
    });
    expect(client.query.mock.calls[0][0]).toContain('b.owner_user_id=$2');
    expect(client.query.mock.calls[0][1]).toEqual(['lead-1', 'owner-1']);
  });
});
