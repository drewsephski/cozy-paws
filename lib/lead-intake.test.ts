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

  it('returns the customer conversation created by the atomic persister', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100, email: 'sitter@example.com' });
    const intake = createLeadIntake(profiles, async () => true, undefined, async ({ lead, createdAt }) => {
      const saved = await profiles.recordLead('happy-tails', {
        name: lead.name, email: lead.email, dates: lead.dateDetails, message: lead.careDetails,
        serviceRequested: lead.serviceRequested, requestedStartDate: lead.requestedStartDate,
        requestedEndDate: lead.requestedEndDate, petTypes: lead.petTypes, petCount: lead.petCount,
        postalCode: lead.postalCode, source: lead.source, campaign: lead.campaign, status: 'NEW'
      }, createdAt);
      return saved ? { ...saved, created: true, conversationToken: 'private-conversation-token' } : null;
    });

    const result = await intake.submit({ subdomain: 'happy-tails', submissionToken: 'submission-token-with-at-least-32-characters', name: 'Sam', email: 'sam@example.com', dates: '', message: 'Two dogs' }, 'ip:1', 200);

    expect(result).toMatchObject({ success: true, conversationToken: 'private-conversation-token', lead: { message: 'Two dogs' } });
  });

  it('does not notify again when a retried submission reuses its canonical Conversation', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100, email: 'sitter@example.com' });
    let notifications = 0;
    const intake = createLeadIntake(profiles, async () => true, async () => { notifications += 1; }, async ({ lead }) => ({
      created: false,
      subdomain: 'happy-tails',
      profile: (await profiles.get('happy-tails'))!,
      lead: { id: 'lead-1', name: lead.name, email: lead.email, dates: lead.dateDetails, message: lead.careDetails, createdAt: 100, readAt: null },
      conversationToken: 'existing-token'
    }));

    const result = await intake.submit({ subdomain: 'happy-tails', submissionToken: 'submission-token-with-at-least-32-characters', name: 'Sam', email: 'sam@example.com', dates: '', message: 'Two dogs' }, 'ip:1', 200);

    expect(result).toMatchObject({ success: true, conversationToken: 'existing-token' });
    expect(notifications).toBe(0);
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
