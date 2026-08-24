import { describe, expect, it } from 'vitest';
import {
  createProfileOwnership,
  normalizeServices
} from './profile-ownership';
import { MemoryProfileRepository } from '../tests/support/memory-profile-repository';

describe('profile ownership', () => {
  it('normalizes and deduplicates service names without inventing content', () => {
    expect(normalizeServices([' Dog walking ', 'dog   walking', 'DROP-INS', '', ' Drop-ins '])).toEqual([
      'Dog walking',
      'DROP-INS'
    ]);
  });
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
    const leads = await profiles.getOwnedLeads('owner-1', 'happy-tails');
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      name: 'Sam',
      email: 'sam@example.com',
      dates: 'Friday',
      message: 'One dog',
      createdAt: 200,
      readAt: null
    });
    expect(leads[0].id).toEqual(expect.any(String));

    expect(await profiles.deleteOwned('owner-2', 'happy-tails')).toBe(false);
    expect(await profiles.deleteOwned('owner-1', 'happy-tails')).toBe(true);
    expect(await profiles.listOwned('owner-1')).toEqual([]);
  });

  it('persists and clears the optional LinkedIn profile through the ownership interface', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', {
      emoji: 'dog',
      createdAt: 100,
      linkedinUrl: 'https://www.linkedin.com/in/drew-sepeczi'
    });

    expect((await profiles.get('happy-tails'))?.linkedinUrl).toBe(
      'https://www.linkedin.com/in/drew-sepeczi'
    );
    await profiles.updateOwned('owner-1', 'happy-tails', { linkedinUrl: null });
    expect((await profiles.get('happy-tails'))?.linkedinUrl).toBeNull();
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

  it('aggregates owned Site Leads and marks one stable Lead read', async () => {
    const repository = new MemoryProfileRepository();
    const profiles = createProfileOwnership(repository);
    await profiles.create('owner-1', 'first-site', { emoji: 'dog', createdAt: 100, businessName: 'First' });
    await profiles.create('owner-1', 'second-site', { emoji: 'cat', createdAt: 100, businessName: 'Second' });
    await profiles.recordLead('first-site', { name: 'Older', email: 'older@example.com', dates: '', message: '' }, 100);
    await profiles.recordLead('second-site', { name: 'Newer', email: 'newer@example.com', dates: '', message: '' }, 200);

    const allLeads = await profiles.getOwnedLeadsForAllSites('owner-1');
    expect(allLeads.map((lead) => [lead.siteName, lead.name])).toEqual([
      ['Second', 'Newer'],
      ['First', 'Older']
    ]);

    expect(await profiles.markLeadRead('owner-1', 'second-site', allLeads[0].id, 300)).toBe(true);
    expect((await profiles.getOwnedLeads('owner-1', 'second-site'))[0].readAt).toBe(300);
    expect(await profiles.markLeadRead('owner-2', 'second-site', allLeads[0].id)).toBe(false);
  });

  it('atomically marks a selected group across owned Sites without changing Lead status', async () => {
    const repository = new MemoryProfileRepository();
    const profiles = createProfileOwnership(repository);
    await profiles.create('owner-1', 'first-site', { emoji: 'dog', createdAt: 100 });
    await profiles.create('owner-1', 'second-site', { emoji: 'cat', createdAt: 100 });
    await profiles.create('owner-2', 'other-site', { emoji: 'cat', createdAt: 100 });
    await profiles.recordLead('first-site', { name: 'Sam', email: 'sam@example.com', dates: '', message: '', status: 'QUALIFIED' }, 100);
    await profiles.recordLead('second-site', { name: 'Sam', email: 'sam@example.com', dates: '', message: '', status: 'QUOTED' }, 200);
    await profiles.recordLead('other-site', { name: 'Other', email: 'other@example.com', dates: '', message: '', status: 'BOOKED' }, 300);
    const ownerLeads = await profiles.getOwnedLeadsForAllSites('owner-1');
    const otherLead = (await profiles.getOwnedLeadsForAllSites('owner-2'))[0];

    await expect(profiles.markLeadsRead('owner-1', [...ownerLeads.map((lead) => lead.id), otherLead.id], 400)).resolves.toEqual(expect.arrayContaining(ownerLeads.map((lead) => lead.id)));
    expect((await profiles.getOwnedLeadsForAllSites('owner-1')).map((lead) => [lead.status, lead.readAt])).toEqual([
      ['QUOTED', 400],
      ['QUALIFIED', 400]
    ]);
    expect((await profiles.getOwnedLeadsForAllSites('owner-2'))[0]).toMatchObject({ status: 'BOOKED', readAt: null });
  });

  it('reuses an already loaded owned Site collection for the owner Lead set query', async () => {
    const repository = new MemoryProfileRepository();
    const profiles = createProfileOwnership(repository);
    await profiles.create('owner-1', 'first-site', { emoji: 'dog', createdAt: 100 });
    await profiles.recordLead('first-site', { name: 'Sam', email: 'sam@example.com', dates: '', message: '' }, 100);
    const sites = await profiles.listOwned('owner-1');
    repository.listOwnerSubdomains = () => { throw new Error('Site collection should not be loaded twice'); };

    await expect(profiles.getOwnedLeadsForSites('owner-1', sites)).resolves.toHaveLength(1);
  });

  it('normalizes legacy Leads as new and persists the stable identity', async () => {
    const repository = new MemoryProfileRepository();
    await repository.createProfile('legacy-site', { ownerId: 'owner-1', emoji: 'dog', createdAt: 100 });
    await repository.writeLeads('legacy-site', [{ name: 'Legacy', email: 'legacy@example.com', dates: '', message: '', createdAt: 100 } as never]);
    const profiles = createProfileOwnership(repository);

    const leads = await profiles.getOwnedLeads('owner-1', 'legacy-site');
    expect(leads[0]).toMatchObject({ name: 'Legacy', readAt: null });
    expect(leads[0].id).toEqual(expect.any(String));
    expect((await repository.readLeads('legacy-site'))[0].id).toBe(leads[0].id);
  });
});
