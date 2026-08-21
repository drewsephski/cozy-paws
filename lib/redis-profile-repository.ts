import { redis } from './redis';
import type { BusinessProfile, Lead, ProfileRepository } from './profile-ownership';

const profileKey = (subdomain: string) => `subdomain:${subdomain}`;
const ownerKey = (ownerId: string) => `owner:${ownerId}:subdomains`;
const leadsKey = (subdomain: string) => `leads:${subdomain}`;

export const redisProfileRepository: ProfileRepository = {
  async readProfile(subdomain) {
    return redis.get<BusinessProfile>(profileKey(subdomain));
  },

  async readProfiles(subdomains) {
    if (!subdomains.length) return [];
    return redis.mget<BusinessProfile[]>(...subdomains.map(profileKey));
  },

  async createProfile(subdomain, profile) {
    return Boolean(await redis.set(profileKey(subdomain), profile, { nx: true }));
  },

  async writeProfile(subdomain, profile) {
    await redis.set(profileKey(subdomain), profile);
  },

  async deleteProfile(subdomain) {
    return (await redis.del(profileKey(subdomain))) > 0;
  },

  async listOwnerSubdomains(ownerId) {
    return redis.smembers<string[]>(ownerKey(ownerId));
  },

  async addOwnerSubdomain(ownerId, subdomain) {
    await redis.sadd(ownerKey(ownerId), subdomain);
  },

  async removeOwnerSubdomain(ownerId, subdomain) {
    await redis.srem(ownerKey(ownerId), subdomain);
  },

  async readLeads(subdomain) {
    return (await redis.get<Lead[]>(leadsKey(subdomain))) ?? [];
  },

  async writeLeads(subdomain, leads) {
    await redis.set(leadsKey(subdomain), leads);
  }
};
