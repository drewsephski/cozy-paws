import { describe, expect, it } from 'vitest';
import { createLeadIntake } from './lead-intake';
import { createProfileOwnership } from './profile-ownership';
import { MemoryProfileRepository } from '../tests/support/memory-profile-repository';

describe('lead intake', () => {
  it('rejects public Lead fields that exceed their limits', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100 });
    const intake = createLeadIntake(profiles, async () => true);

    const result = await intake.submit({
      subdomain: 'happy-tails',
      name: ` ${'N'.repeat(200)} `,
      email: 'owner@example.com',
      dates: 'Next week',
      message: 'M'.repeat(3000)
    }, 'ip:1', 200);

    expect(result).toMatchObject({ success: false, error: expect.stringContaining('shorten') });
    expect(await profiles.getOwnedLeads('owner-1', 'happy-tails')).toEqual([]);
  });

  it('rejects malformed or rate-limited submissions', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100 });
    const allowed = false;
    const intake = createLeadIntake(profiles, async () => allowed);

    await expect(intake.submit({ subdomain: 'happy-tails', name: 'Sam', email: 'bad', dates: '', message: '' }, 'ip:1'))
      .resolves.toMatchObject({ success: false });
    await expect(intake.submit({ subdomain: 'happy-tails', name: 'Sam', email: 'sam@example.com', dates: '', message: '' }, 'ip:1'))
      .resolves.toMatchObject({ success: false, error: expect.stringContaining('wait') });
  });

  it('notifies once with the canonical Lead and Site destination after persistence', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100, businessName: 'Happy Tails', email: 'sitter@example.com' });
    const notifications: unknown[] = [];
    const intake = createLeadIntake(profiles, async () => true, async (accepted) => { notifications.push(accepted); });

    const result = await intake.submit({ subdomain: 'happy-tails', name: ' Ada ', email: 'ada@example.com', dates: 'Sep 15', message: '  Two calm dogs.  ', service: 'Dog walking', startDate: '2026-09-15', endDate: '2026-09-16', petTypes: 'Dogs', petCount: '2', postalCode: '60601' }, 'ip:1', 200);

    expect(result).toMatchObject({ success: true, subdomain: 'happy-tails' });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ profile: { email: 'sitter@example.com' }, lead: { name: 'Ada', email: 'ada@example.com', serviceRequested: 'Dog walking', petCount: 2 } });
    expect(await profiles.getOwnedLeads('owner-1', 'happy-tails')).toHaveLength(1);
  });

  it('starts the customer conversation after the Lead is persisted', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100, email: 'sitter@example.com' });
    let persistedLeadId = '';
    const intake = createLeadIntake(profiles, async () => true, undefined, async (leadId) => {
      persistedLeadId = leadId;
      return 'private-conversation-token';
    });

    const result = await intake.submit({ subdomain: 'happy-tails', name: 'Sam', email: 'sam@example.com', dates: '', message: 'Two dogs' }, 'ip:1', 200);

    expect(persistedLeadId).toMatch(/[a-f0-9-]{36}/);
    expect(result).toMatchObject({ success: true, conversationToken: 'private-conversation-token', lead: { message: 'Two dogs' } });
  });

  it('does not notify invalid or rate-limited submissions', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100, email: 'sitter@example.com' });
    let attempts = 0;
    const intake = createLeadIntake(profiles, async () => false, async () => { attempts += 1; });

    await intake.submit({ subdomain: 'happy-tails', name: 'Sam', email: 'bad', dates: '', message: '' }, 'ip:1');
    await intake.submit({ subdomain: 'happy-tails', name: 'Sam', email: 'sam@example.com', dates: '', message: '' }, 'ip:1');
    expect(attempts).toBe(0);
  });

  it('keeps the accepted Lead successful when notification fails or Site email is missing', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100 });
    const intake = createLeadIntake(profiles, async () => true, async () => { throw new Error('provider unavailable'); });

    await expect(intake.submit({ subdomain: 'happy-tails', name: 'Sam', email: 'sam@example.com', dates: '', message: 'Details' }, 'ip:1')).resolves.toMatchObject({ success: true });
    expect(await profiles.getOwnedLeads('owner-1', 'happy-tails')).toHaveLength(1);
  });
});
