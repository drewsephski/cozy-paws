import { describe, expect, it } from 'vitest';
import {
  createProfileOwnership
} from './profile-ownership';
import { MemoryProfileRepository } from '../tests/support/memory-profile-repository';

describe('profile ownership', () => {
  it('normalizes profile identity and enforces ownership through one interface', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    const created = await profiles.create('owner-1', 'Happy Tails!', {
      emoji: 'dog',
      createdAt: 100
    });

    expect(created?.subdomain).toBe('happytails');
    expect(await profiles.getOwned('HAPPY TAILS!', 'owner-1')).toEqual(created);
    expect(await profiles.getOwned('HAPPY TAILS!', 'owner-2')).toBeNull();
  });

  it('keeps writes, owner indexing, deletion, and lead access ownership-aware', async () => {
    const repository = new MemoryProfileRepository();
    const profiles = createProfileOwnership(repository);
    await profiles.create('owner-1', 'happy-tails', {
      emoji: 'dog',
      createdAt: 100,
      businessName: 'Happy Tails'
    });

    expect((await profiles.listOwned('owner-1')).map(({ subdomain }) => subdomain)).toEqual([
      'happy-tails'
    ]);
    expect(await profiles.updateOwned('owner-2', 'happy-tails', { tagline: 'Nope' })).toBeNull();
    expect((await profiles.updateOwned('owner-1', 'happy-tails', { tagline: 'Trusted care' }))?.tagline).toBe(
      'Trusted care'
    );
    expect((await profiles.get('happy-tails'))?.businessName).toBe('Happy Tails');

    await profiles.recordLead(
      'happy-tails',
      { name: 'Sam', email: 'sam@example.com', dates: 'Friday', message: 'One dog' },
      200
    );
    expect(await profiles.getOwnedLeads('owner-2', 'happy-tails')).toEqual([]);
    expect(await profiles.getOwnedLeads('owner-1', 'happy-tails')).toEqual([
      {
        name: 'Sam',
        email: 'sam@example.com',
        dates: 'Friday',
        message: 'One dog',
        createdAt: 200
      }
    ]);

    expect(await profiles.deleteOwned('owner-2', 'happy-tails')).toBe(false);
    expect(await profiles.deleteOwned('owner-1', 'happy-tails')).toBe(true);
    expect(await profiles.listOwned('owner-1')).toEqual([]);
  });

  it('filters stale owner-index entries and caps canonical lead history at 100', async () => {
    const repository = new MemoryProfileRepository();
    repository.owners.set('owner-1', new Set(['missing', 'other-site']));
    repository.profiles.set('other-site', {
      ownerId: 'owner-2',
      emoji: 'cat',
      createdAt: 100
    });
    const profiles = createProfileOwnership(repository);

    expect(await profiles.listOwned('owner-1')).toEqual([]);

    await profiles.create('owner-1', 'Happy Tails!', { emoji: 'dog', createdAt: 100 });
    for (let index = 0; index < 101; index += 1) {
      await profiles.recordLead(
        'HAPPY TAILS!',
        {
          name: `Lead ${index}`,
          email: `lead-${index}@example.com`,
          dates: '',
          message: ''
        },
        index
      );
    }

    const leads = await profiles.getOwnedLeads('owner-1', 'happy tails!');
    expect(leads).toHaveLength(100);
    expect(leads[0]).toMatchObject({ name: 'Lead 100', createdAt: 100 });
    expect(leads.at(-1)).toMatchObject({ name: 'Lead 1', createdAt: 1 });
  });
});
