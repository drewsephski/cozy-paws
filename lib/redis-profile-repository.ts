import { getRedis } from './redis';
import type { BusinessProfile, Lead, ProfileRepository } from './profile-ownership';

const profileKey = (subdomain: string) => `subdomain:${subdomain}`;
const ownerKey = (ownerId: string) => `owner:${ownerId}:subdomains`;
const leadsKey = (subdomain: string) => `leads:${subdomain}`;

export const redisProfileRepository: ProfileRepository = {
  async readProfile(subdomain) {
    return getRedis().get<BusinessProfile>(profileKey(subdomain));
  },

  async readProfiles(subdomains) {
    if (!subdomains.length) return [];
    return getRedis().mget<BusinessProfile[]>(...subdomains.map(profileKey));
  },

  async createProfile(subdomain, profile) {
    return Boolean(await getRedis().set(profileKey(subdomain), profile, { nx: true }));
  },

  async writeProfile(subdomain, profile) {
    await getRedis().set(profileKey(subdomain), profile);
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
