import { postgresGrowthEvidenceRepository } from './postgres-growth-evidence';
import { deriveBusinessActivation, type BusinessActivationEvidence } from './domain/growth-activation';
import { normalizeSubdomain } from './profile-ownership';
export type { BusinessActivationEvidence } from './domain/growth-activation';

export type OperationalGrowthEvidence = {
  publishedSites: number;
  sharedBusinesses: number;
  qualifiedBusinesses: number;
  inquiries: number;
  sitterReplies: number;
  qualifiedLeads: number;
  settledLeadPayments: number;
  completedBookings: number;
  activeBusinesses30d: number;
};

export type GrowthEvidenceRepository = {
  recordOwnedSiteShare(ownerUserId: string, subdomain: string): Promise<boolean>;
  getOwnerActivationEvidence(ownerUserId: string): Promise<BusinessActivationEvidence[]>;
  getOperationalEvidence(): Promise<OperationalGrowthEvidence>;
};

export type OwnerGrowthActivation = { setupActivated: boolean; valueActivated: boolean };

export type OperationalGrowthReport = {
  acquisition: { selectedContacts: number | null; substantiveConversations: number | null; trials: number | null; publishedSites: number; sharedBusinesses: number; qualifiedBusinesses: number; payingBusinesses: number | null; referrals: number | null; activeBusinesses30d: number };
  ownerJourney: { inquiries: number; sitterReplies: number; qualifiedLeads: number; settledLeadPayments: number; completedBookings: number; reviews: number | null };
};

export function createGrowthEvidence(repository: GrowthEvidenceRepository = postgresGrowthEvidenceRepository) {
  return {
    recordOwnedSiteShare(ownerUserId: string, subdomain: string) {
      const normalized = normalizeSubdomain(subdomain);
      if (normalized !== subdomain || normalized.length < 3 || normalized.length > 30) return Promise.resolve(false);
      return repository.recordOwnedSiteShare(ownerUserId, normalized);
    },

    async getOwnerActivation(ownerUserId: string) {
      const businesses = (await repository.getOwnerActivationEvidence(ownerUserId)).map(deriveBusinessActivation);
      return {
        setupActivated: businesses.some((business) => business.setupActivatedAt !== null),
        valueActivated: businesses.some((business) => business.valueActivatedAt !== null),
        businesses
      };
    },

    async getOperationalReport(): Promise<OperationalGrowthReport> {
      const evidence = await repository.getOperationalEvidence();
      return {
        acquisition: {
          selectedContacts: null,
          substantiveConversations: null,
          trials: null,
          publishedSites: evidence.publishedSites,
          sharedBusinesses: evidence.sharedBusinesses,
          qualifiedBusinesses: evidence.qualifiedBusinesses,
          payingBusinesses: null,
          referrals: null,
          activeBusinesses30d: evidence.activeBusinesses30d
        },
        ownerJourney: {
          inquiries: evidence.inquiries,
          sitterReplies: evidence.sitterReplies,
          qualifiedLeads: evidence.qualifiedLeads,
          settledLeadPayments: evidence.settledLeadPayments,
          completedBookings: evidence.completedBookings,
          reviews: null
        }
      };
    }
  };
}

export const growthEvidence = createGrowthEvidence();
