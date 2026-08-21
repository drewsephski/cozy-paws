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
});
