import { normalizeServices as normalizeProfileServices, type ServiceProfileDetail } from './domain/profile-content';

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
  availabilityStatus?: 'ACCEPTING' | 'LIMITED' | 'UNAVAILABLE';
  availabilityUntil?: string | null;
  yearsExperience?: number | null;
  careCapabilities?: string[];
  meetAndGreetExpectations?: string;
  cancellationExpectations?: string;
  selfReportedCredentials?: string[];
  about?: string;
  careRoutine?: string;
  homeEnvironment?: string;
  petPreferences?: string;
  experienceSummary?: string;
  specialCareSummary?: string;
  serviceDetails?: Record<string, ServiceProfileDetail>;
  profileRevision?: number;
};

export type LoadedBusinessProfile = BusinessProfile & { profileRevision: number };
export type ProfileRecord = LoadedBusinessProfile & { subdomain: string };

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
  readProfile(subdomain: string): Promise<LoadedBusinessProfile | null>;
  readProfiles(subdomains: string[]): Promise<Array<LoadedBusinessProfile | null>>;
  createProfile(subdomain: string, profile: BusinessProfile): Promise<boolean>;
  writeProfile(subdomain: string, profile: BusinessProfile): Promise<LoadedBusinessProfile>;
  deleteProfile(subdomain: string): Promise<boolean>;
  listOwnerSubdomains(ownerId: string): Promise<string[]>;
  addOwnerSubdomain(ownerId: string, subdomain: string): Promise<void>;
  removeOwnerSubdomain(ownerId: string, subdomain: string): Promise<void>;
  readLeads(subdomain: string): Promise<Lead[]>;
  writeLeads(subdomain: string, leads: Lead[]): Promise<void>;
  readOwnerLeads(ownerId: string, profiles: ProfileRecord[]): Promise<OwnedLead[]>;
  markLeadsRead(ownerId: string, leadIds: string[], readAt: number): Promise<string[]>;
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
  return normalizeProfileServices(services, limit);
}

export function createProfileOwnership(repository: ProfileRepository) {
  async function get(subdomain: string): Promise<ProfileRecord | null> {
    const normalized = normalizeSubdomain(subdomain);
    if (!normalized) return null;
    const profile = await repository.readProfile(normalized);
    return profile ? { ...profile, profileRevision: profile.profileRevision ?? 0, subdomain: normalized } : null;
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
        profile?.ownerId === ownerId ? [{ ...profile, profileRevision: profile.profileRevision ?? 0, subdomain: subdomains[index] }] : []
      );
    },

    async create(
      ownerId: string,
      subdomain: string,
      profile: Omit<BusinessProfile, 'ownerId' | 'profileRevision'> & { profileRevision?: number }
    ) {
      const normalized = normalizeSubdomain(subdomain);
      if (!normalized) return null;
      const ownedProfile = { profileRevision: profile.profileRevision ?? 0, ...profile, ownerId };
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
      const written = await repository.writeProfile(normalized, updated);
      return { ...written, subdomain: normalized };
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
      return repository.readOwnerLeads(ownerId, ownedProfiles);
    },

    async getOwnedLeadsForSites(ownerId: string, ownedProfiles: ProfileRecord[]) {
      const verified = ownedProfiles.filter((profile) => profile.ownerId === ownerId);
      return repository.readOwnerLeads(ownerId, verified);
    },

    async markLeadsRead(ownerId: string, leadIds: string[], readAt = Date.now()) {
      const selected = [...new Set(leadIds.filter(Boolean))];
      if (!selected.length) return [];
      return repository.markLeadsRead(ownerId, selected, readAt);
    },

    async markLeadRead(ownerId: string, subdomain: string, leadId: string, readAt = Date.now()) {
      const profile = await getOwned(subdomain, ownerId);
      if (!profile) return false;
      return (await repository.markLeadsRead(ownerId, [leadId], readAt)).includes(leadId);
    }
  };
}

export type ProfileOwnership = ReturnType<typeof createProfileOwnership>;
