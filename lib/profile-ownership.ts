export type BusinessProfile = {
  ownerId?: string;
  emoji: string;
  createdAt: number;
  businessName?: string;
  tagline?: string;
  location?: string;
  services?: string[];
  phone?: string;
  email?: string;
  profileImageUrl?: string;
  onboardingCompletedAt?: number | null;
};

export type ProfileRecord = BusinessProfile & { subdomain: string };

export type Lead = {
  name: string;
  email: string;
  dates: string;
  message: string;
  createdAt: number;
};

export type ProfileRepository = {
  readProfile(subdomain: string): Promise<BusinessProfile | null>;
  readProfiles(subdomains: string[]): Promise<Array<BusinessProfile | null>>;
  createProfile(subdomain: string, profile: BusinessProfile): Promise<boolean>;
  writeProfile(subdomain: string, profile: BusinessProfile): Promise<void>;
  deleteProfile(subdomain: string): Promise<boolean>;
  listOwnerSubdomains(ownerId: string): Promise<string[]>;
  addOwnerSubdomain(ownerId: string, subdomain: string): Promise<void>;
  removeOwnerSubdomain(ownerId: string, subdomain: string): Promise<void>;
  readLeads(subdomain: string): Promise<Lead[]>;
  writeLeads(subdomain: string, leads: Lead[]): Promise<void>;
};

export function normalizeSubdomain(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function createProfileOwnership(repository: ProfileRepository) {
  async function get(subdomain: string): Promise<ProfileRecord | null> {
    const normalized = normalizeSubdomain(subdomain);
    if (!normalized) return null;
    const profile = await repository.readProfile(normalized);
    return profile ? { ...profile, subdomain: normalized } : null;
  }

  async function getOwned(subdomain: string, ownerId: string) {
    const profile = await get(subdomain);
    return profile?.ownerId === ownerId ? profile : null;
  }

  return {
    get,
    getOwned,

    async listOwned(ownerId: string) {
      const subdomains = (await repository.listOwnerSubdomains(ownerId)).map(normalizeSubdomain);
      const storedProfiles = await repository.readProfiles(subdomains);
      return storedProfiles.flatMap((profile, index) =>
        profile?.ownerId === ownerId ? [{ ...profile, subdomain: subdomains[index] }] : []
      );
    },

    async create(
      ownerId: string,
      subdomain: string,
      profile: Omit<BusinessProfile, 'ownerId'>
    ) {
      const normalized = normalizeSubdomain(subdomain);
      if (!normalized) return null;
      const ownedProfile = { ...profile, ownerId };
      const created = await repository.createProfile(normalized, ownedProfile);
      if (!created) return null;
      await repository.addOwnerSubdomain(ownerId, normalized);
      return { ...ownedProfile, subdomain: normalized };
    },

    async updateOwned(
      ownerId: string,
      subdomain: string,
      updates: Partial<Omit<BusinessProfile, 'ownerId' | 'createdAt'>>
    ) {
      const current = await getOwned(subdomain, ownerId);
      if (!current) return null;
      const { subdomain: normalized, ...profile } = current;
      const updated = { ...profile, ...updates };
      await repository.writeProfile(normalized, updated);
      return { ...updated, subdomain: normalized };
    },

    async deleteOwned(ownerId: string, subdomain: string) {
      const current = await getOwned(subdomain, ownerId);
      if (!current) return false;
      await repository.deleteProfile(current.subdomain);
      await repository.removeOwnerSubdomain(ownerId, current.subdomain);
      return true;
    },

    async recordLead(
      subdomain: string,
      input: Omit<Lead, 'createdAt'>,
      createdAt = Date.now()
    ) {
      const profile = await get(subdomain);
      if (!profile) return false;
      const leads = await repository.readLeads(profile.subdomain);
      await repository.writeLeads(
        profile.subdomain,
        [{ ...input, createdAt }, ...leads].slice(0, 100)
      );
      return profile.subdomain;
    },

    async getOwnedLeads(ownerId: string, subdomain: string) {
      const profile = await getOwned(subdomain, ownerId);
      return profile ? repository.readLeads(profile.subdomain) : [];
    }
  };
}

export type ProfileOwnership = ReturnType<typeof createProfileOwnership>;
