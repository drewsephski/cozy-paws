import type {
  BusinessProfile,
  Lead,
  ProfileRepository
} from '../../lib/profile-ownership';

export class MemoryProfileRepository implements ProfileRepository {
  readonly profiles = new Map<string, BusinessProfile>();
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
    this.profiles.set(subdomain, profile);
    return Promise.resolve(true);
  }

  writeProfile(subdomain: string, profile: BusinessProfile) {
    this.profiles.set(subdomain, profile);
    return Promise.resolve();
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
}
