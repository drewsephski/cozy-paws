import type {
  BusinessProfile,
  Lead,
  LoadedBusinessProfile,
  ProfileRecord,
  ProfileRepository
} from '../../lib/profile-ownership';

export class MemoryProfileRepository implements ProfileRepository {
  readonly profiles = new Map<string, LoadedBusinessProfile>();
  readonly owners = new Map<string, Set<string>>();
  readonly leads = new Map<string, Lead[]>();

  readProfile(subdomain: string) {
    return Promise.resolve(this.profiles.get(subdomain) ?? null);
  }

  readProfiles(subdomains: string[]) {
    return Promise.resolve(subdomains.map((subdomain) => this.profiles.get(subdomain) ?? null));
  }

  createProfile(subdomain: string, profile: BusinessProfile) {
    if (this.profiles.has(subdomain)) return Promise.resolve(false);
    this.profiles.set(subdomain, { ...profile, profileRevision: profile.profileRevision ?? 0 });
    return Promise.resolve(true);
  }

  writeProfile(subdomain: string, profile: BusinessProfile) {
    const written = { ...profile, profileRevision: (this.profiles.get(subdomain)?.profileRevision ?? 0) + 1 };
    this.profiles.set(subdomain, written);
    return Promise.resolve(written);
  }

  deleteProfile(subdomain: string) {
    return Promise.resolve(this.profiles.delete(subdomain));
  }

  listOwnerSubdomains(ownerId: string) {
    return Promise.resolve([...(this.owners.get(ownerId) ?? [])]);
  }

  addOwnerSubdomain(ownerId: string, subdomain: string) {
    const subdomains = this.owners.get(ownerId) ?? new Set<string>();
    subdomains.add(subdomain);
    this.owners.set(ownerId, subdomains);
    return Promise.resolve();
  }

  removeOwnerSubdomain(ownerId: string, subdomain: string) {
    this.owners.get(ownerId)?.delete(subdomain);
    return Promise.resolve();
  }

  readLeads(subdomain: string) {
    return Promise.resolve(this.leads.get(subdomain) ?? []);
  }

  writeLeads(subdomain: string, leads: Lead[]) {
    this.leads.set(subdomain, leads);
    return Promise.resolve();
  }

  readOwnerLeads(ownerId: string, profiles: ProfileRecord[]) {
    return Promise.resolve(profiles.flatMap((profile) =>
      profile.ownerId === ownerId
        ? (this.leads.get(profile.subdomain) ?? []).map((lead) => ({
            ...lead,
            subdomain: profile.subdomain,
            siteName: profile.businessName || profile.sitterName || profile.subdomain
          }))
        : []
    ).sort((a, b) => b.createdAt - a.createdAt));
  }

  markLeadsRead(ownerId: string, leadIds: string[], readAt: number) {
    const selected = new Set(leadIds);
    const marked: string[] = [];
    for (const [subdomain, leads] of this.leads) {
      if (this.profiles.get(subdomain)?.ownerId !== ownerId) continue;
      this.leads.set(subdomain, leads.map((lead) => {
        if (!selected.has(lead.id)) return lead;
        marked.push(lead.id);
        return { ...lead, readAt };
      }));
    }
    return Promise.resolve(marked);
  }
}
