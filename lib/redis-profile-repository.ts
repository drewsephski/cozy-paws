import { getRedis } from './redis';
import type { BusinessProfile, Lead, ProfileRepository } from './profile-ownership';

const profileKey = (subdomain: string) => `subdomain:${subdomain}`;
const ownerKey = (ownerId: string) => `owner:${ownerId}:subdomains`;
const leadsKey = (subdomain: string) => `leads:${subdomain}`;

export const redisProfileRepository: ProfileRepository = {
  async readProfile(subdomain) {
    const profile = await getRedis().get<BusinessProfile>(profileKey(subdomain));
    return profile ? { ...profile, profileRevision: profile.profileRevision ?? 0 } : null;
  },

  async readProfiles(subdomains) {
    if (!subdomains.length) return [];
    const profiles = await getRedis().mget<Array<BusinessProfile | null>>(...subdomains.map(profileKey));
    return profiles.map((profile) => profile ? { ...profile, profileRevision: profile.profileRevision ?? 0 } : null);
  },

  async createProfile(subdomain, profile) {
    return Boolean(await getRedis().set(profileKey(subdomain), { ...profile, profileRevision: profile.profileRevision ?? 0 }, { nx: true }));
  },

  async writeProfile(subdomain, profile) {
    const written = { ...profile, profileRevision: (profile.profileRevision ?? 0) + 1 };
    await getRedis().set(profileKey(subdomain), written);
    return written;
  },

  async deleteProfile(subdomain) {
    return (await getRedis().del(profileKey(subdomain))) > 0;
  },

  async listOwnerSubdomains(ownerId) {
    return getRedis().smembers<string[]>(ownerKey(ownerId));
  },

  async addOwnerSubdomain(ownerId, subdomain) {
    await getRedis().sadd(ownerKey(ownerId), subdomain);
  },

  async removeOwnerSubdomain(ownerId, subdomain) {
    await getRedis().srem(ownerKey(ownerId), subdomain);
  },

  async readLeads(subdomain) {
    return (await getRedis().get<Lead[]>(leadsKey(subdomain))) ?? [];
  },

  async writeLeads(subdomain, leads) {
    await getRedis().set(leadsKey(subdomain), leads);
  },

  async readOwnerLeads(ownerId, profiles) {
    const grouped = await Promise.all(profiles.filter((profile) => profile.ownerId === ownerId).map(async (profile) =>
      (await this.readLeads(profile.subdomain)).map((lead) => ({
        ...lead,
        subdomain: profile.subdomain,
        siteName: profile.businessName || profile.sitterName || profile.subdomain
      }))
    ));
    return grouped.flat().sort((a, b) => b.createdAt - a.createdAt);
  },

  async markLeadsRead(ownerId, leadIds, readAt) {
    const selected = new Set(leadIds);
    const marked: string[] = [];
    for (const subdomain of await this.listOwnerSubdomains(ownerId)) {
      const profile = await this.readProfile(subdomain);
      if (profile?.ownerId !== ownerId) continue;
      const leads = await this.readLeads(subdomain);
      const updated = leads.map((lead) => {
        if (!selected.has(lead.id)) return lead;
        marked.push(lead.id);
        return { ...lead, readAt };
      });
      if (updated.some((lead, index) => lead !== leads[index])) await this.writeLeads(subdomain, updated);
    }
    return marked;
  }
};
