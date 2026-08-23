import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieGetMock, cookieSetMock, getCustomerConversationMock } = vi.hoisted(() => ({
  cookieGetMock: vi.fn(),
  cookieSetMock: vi.fn(),
  getCustomerConversationMock: vi.fn()
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: cookieGetMock, set: cookieSetMock }))
}));
vi.mock('./conversations', () => ({
  getCustomerConversation: getCustomerConversationMock
}));

import { conversationReturnCookieName, getConversationReturnToken, rememberConversationReturn } from './conversation-return';

describe('conversation return link', () => {
  beforeEach(() => {
    cookieGetMock.mockReset();
    cookieSetMock.mockReset();
    getCustomerConversationMock.mockReset();
  });

  it('stores the bearer token in a host-scoped HTTP-only cookie', async () => {
    await rememberConversationReturn('Drews', 'private-token');

    expect(cookieSetMock).toHaveBeenCalledWith(
      conversationReturnCookieName('drews'),
      'private-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    );
  });

  it('returns an open conversation only for the requested sitter site', async () => {
    cookieGetMock.mockReturnValue({ value: 'private-token' });
    getCustomerConversationMock.mockResolvedValue({ subdomain: 'drews' });

    await expect(getConversationReturnToken('drews')).resolves.toBe('private-token');
    await expect(getConversationReturnToken('another-sitter')).resolves.toBeNull();
  });

  it('does not query without a saved return link', async () => {
    cookieGetMock.mockReturnValue(undefined);

    await expect(getConversationReturnToken('drews')).resolves.toBeNull();
    expect(getCustomerConversationMock).not.toHaveBeenCalled();
  });
});
