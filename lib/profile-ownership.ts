export type BusinessProfile = {
  ownerId?: string;
  emoji: string;
  createdAt: number;
  sitterName?: string;
  businessName?: string;
  tagline?: string;
  location?: string;
  services?: string[];
  phone?: string;
  email?: string;
  linkedinUrl?: string | null;
  profileImageUrl?: string;
  onboardingCompletedAt?: number | null;
  paymentLinkUrl?: string;
};

export type ProfileRecord = BusinessProfile & { subdomain: string };

export type Lead = {
  id: string;
  name: string;
  email: string;
  dates: string;
  message: string;
  createdAt: number;
  readAt: number | null;
  serviceRequested?: string;
  requestedStartDate?: string | null;
  requestedEndDate?: string | null;
  petTypes?: string[];
  petCount?: number | null;
  postalCode?: string;
  source?: string;
  campaign?: string | null;
  status?: import('./domain/leads').LeadStatus;
};

export type OwnedLead = Lead & { subdomain: string; siteName: string };

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

type LegacyLead = Omit<Lead, 'id' | 'readAt'> & Partial<Pick<Lead, 'id' | 'readAt'>>;

function normalizeLeads(leads: LegacyLead[]) {
  let changed = false;
  const normalized = leads.map((lead) => {
    if (lead.id && 'readAt' in lead) return lead as Lead;
    changed = true;
    return {
      ...lead,
      id: lead.id || crypto.randomUUID(),
      readAt: lead.readAt ?? null
    };
  });
  return { changed, leads: normalized };
}

export function normalizeSubdomain(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function normalizeServices(services: readonly string[], limit = 8) {
  const seen = new Set<string>();

  return services.flatMap((service) => {
    const normalized = service.trim().replace(/\s+/g, ' ');
    const key = normalized.toLocaleLowerCase('en-US');
    if (!normalized || seen.has(key)) return [];
    seen.add(key);
    return [normalized];
  }).slice(0, limit);
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
      input: Omit<Lead, 'createdAt' | 'id' | 'readAt'>,
      createdAt = Date.now()
    ) {
      const profile = await get(subdomain);
      if (!profile) return false;
      const lead = { ...input, createdAt, id: crypto.randomUUID(), readAt: null };
      const leads = await repository.readLeads(profile.subdomain);
      await repository.writeLeads(
        profile.subdomain,
        [lead, ...leads].slice(0, 100)
      );
      return { subdomain: profile.subdomain, profile, lead };
    },

    async getOwnedLeads(ownerId: string, subdomain: string) {
      const profile = await getOwned(subdomain, ownerId);
      if (!profile) return [];
      const stored = await repository.readLeads(profile.subdomain);
      const normalized = normalizeLeads(stored);
      if (normalized.changed) await repository.writeLeads(profile.subdomain, normalized.leads);
      return normalized.leads;
    },

    async getOwnedLeadsForAllSites(ownerId: string) {
      const ownedProfiles = await this.listOwned(ownerId);
      const siteLeads = await Promise.all(
        ownedProfiles.map(async (profile) =>
          (await this.getOwnedLeads(ownerId, profile.subdomain)).map((lead) => ({
            ...lead,
            subdomain: profile.subdomain,
            siteName: profile.businessName || profile.sitterName || profile.subdomain
          }))
        )
      );
      return siteLeads.flat().sort((a, b) => b.createdAt - a.createdAt);
    },

    async markLeadRead(ownerId: string, subdomain: string, leadId: string, readAt = Date.now()) {
      const profile = await getOwned(subdomain, ownerId);
      if (!profile) return false;
      const stored = await repository.readLeads(profile.subdomain);
      const normalized = normalizeLeads(stored);
      const index = normalized.leads.findIndex((lead) => lead.id === leadId);
      if (index < 0) return false;
      normalized.leads[index] = { ...normalized.leads[index], readAt };
      await repository.writeLeads(profile.subdomain, normalized.leads);
      return true;
    }
  };
}

export type ProfileOwnership = ReturnType<typeof createProfileOwnership>;
