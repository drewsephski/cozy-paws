import { describe, expect, it, vi } from 'vitest';
import { submitAuthenticatedLead } from './authenticated-lead-intake';

describe('authenticated customer Lead intake', () => {
  it('derives customer identity and attribution from the authenticated session', async () => {
    const submit = vi.fn().mockResolvedValue({ success: true, subdomain: 'happy-tails', lead: { id: 'lead-1' }, conversationToken: 'token' });

    await submitAuthenticatedLead(
      { id: 'customer-1', name: 'Session Name', email: 'SESSION@example.com' },
      { subdomain: 'happy-tails', details: 'Hello', submissionToken: 'submission-token-with-at-least-32-characters', name: 'Tampered Name', email: 'attacker@example.com' } as never,
      'rate-key',
      submit
    );

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Session Name',
      email: 'session@example.com',
      source: 'sitterfolio_account_message',
      message: 'Hello'
    }), 'rate-key');
  });

  it('rejects direct unauthenticated action access before persistence', async () => {
    const submit = vi.fn();

    await expect(submitAuthenticatedLead(null, {
      subdomain: 'happy-tails', details: 'Hello', submissionToken: 'submission-token-with-at-least-32-characters'
    }, 'rate-key', submit)).resolves.toEqual({ success: false, error: 'Sign in to start this conversation.' });
    expect(submit).not.toHaveBeenCalled();
  });
});
