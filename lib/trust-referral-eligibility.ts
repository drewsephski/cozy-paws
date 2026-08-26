import { postgresTestimonialRepository } from './postgres-testimonial-repository';

export const SELF_PUBLISHED_TESTIMONIAL = 'SELF_PUBLISHED_TESTIMONIAL' as const;

export type Testimonial = {
  id: string;
  siteId: string;
  businessId: string;
  siteSubdomain: string;
  type: typeof SELF_PUBLISHED_TESTIMONIAL;
  text: string;
  source: string;
  permissionAttestedAt: Date;
  publishedAt: Date | null;
  hiddenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type TestimonialSite = { id: string; businessId: string; ownerUserId: string; subdomain: string };

export type TestimonialRepository = {
  findOwnedSite(ownerUserId: string, subdomain: string): Promise<TestimonialSite | null>;
  create(input: Omit<Testimonial, 'id'>): Promise<Testimonial>;
  updateOwned(ownerUserId: string, testimonialId: string, update: Pick<Testimonial, 'text' | 'source' | 'permissionAttestedAt' | 'updatedAt'>): Promise<Testimonial | null>;
  setPublishedOwned(ownerUserId: string, testimonialId: string, update: Pick<Testimonial, 'publishedAt' | 'hiddenAt' | 'updatedAt'>): Promise<Testimonial | null>;
  softDeleteOwned(ownerUserId: string, testimonialId: string, deletedAt: Date): Promise<boolean>;
  listOwned(ownerUserId: string): Promise<Testimonial[]>;
  listPublic(subdomain: string): Promise<Testimonial[]>;
};

export const TESTIMONIAL_ERROR_CODES = ['INVALID_TESTIMONIAL', 'PERMISSION_REQUIRED', 'SITE_NOT_OWNED', 'TESTIMONIAL_NOT_OWNED'] as const;
export type TestimonialErrorCode = typeof TESTIMONIAL_ERROR_CODES[number];

export class TestimonialError extends Error {
  constructor(readonly code: TestimonialErrorCode, message: string) {
    super(message);
    this.name = 'TestimonialError';
  }
}

function normalizeText(value: unknown, field: 'testimonial' | 'source', maximum: number) {
  if (typeof value !== 'string') throw new TestimonialError('INVALID_TESTIMONIAL', `Add a ${field}.`);
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > maximum) throw new TestimonialError('INVALID_TESTIMONIAL', `Keep the ${field} between 1 and ${maximum} characters.`);
  return normalized;
}

function publicationState(testimonial: Testimonial) {
  return testimonial.publishedAt ? 'PUBLISHED' as const : 'HIDDEN' as const;
}

function exportedTestimonial(testimonial: Testimonial) {
  return {
    id: testimonial.id,
    siteSubdomain: testimonial.siteSubdomain,
    type: testimonial.type,
    text: testimonial.text,
    displayedSource: testimonial.source,
    permissionAttestedAt: testimonial.permissionAttestedAt.toISOString(),
    publicationState: publicationState(testimonial),
    publishedAt: testimonial.publishedAt?.toISOString() ?? null,
    hiddenAt: testimonial.hiddenAt?.toISOString() ?? null,
    createdAt: testimonial.createdAt.toISOString(),
    updatedAt: testimonial.updatedAt.toISOString()
  };
}

export function createTrustReferralEligibility(repository: TestimonialRepository = postgresTestimonialRepository, now = () => new Date()) {
  return {
    async createOwnedTestimonial(ownerUserId: string, input: { subdomain: string; text: unknown; source: unknown; permissionAttested: unknown; published: boolean }) {
      const site = await repository.findOwnedSite(ownerUserId, input.subdomain);
      if (!site) throw new TestimonialError('SITE_NOT_OWNED', 'The Site was not found for this owner.');
      if (input.permissionAttested !== true) throw new TestimonialError('PERMISSION_REQUIRED', 'Confirm that you have permission to publish this testimonial.');
      const timestamp = now();
      return repository.create({
        siteId: site.id,
        businessId: site.businessId,
        siteSubdomain: site.subdomain,
        type: SELF_PUBLISHED_TESTIMONIAL,
        text: normalizeText(input.text, 'testimonial', 1_000),
        source: normalizeText(input.source, 'source', 120),
        permissionAttestedAt: timestamp,
        publishedAt: input.published ? timestamp : null,
        hiddenAt: input.published ? null : timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null
      });
    },

    async updateOwnedTestimonial(ownerUserId: string, testimonialId: string, input: { text: unknown; source: unknown; permissionAttested: unknown }) {
      if (input.permissionAttested !== true) throw new TestimonialError('PERMISSION_REQUIRED', 'Confirm that you still have permission to publish this testimonial.');
      const timestamp = now();
      const updated = await repository.updateOwned(ownerUserId, testimonialId, {
        text: normalizeText(input.text, 'testimonial', 1_000),
        source: normalizeText(input.source, 'source', 120),
        permissionAttestedAt: timestamp,
        updatedAt: timestamp
      });
      if (!updated) throw new TestimonialError('TESTIMONIAL_NOT_OWNED', 'The testimonial was not found for this owner.');
      return updated;
    },

    async setOwnedTestimonialPublished(ownerUserId: string, testimonialId: string, published: boolean) {
      const timestamp = now();
      const updated = await repository.setPublishedOwned(ownerUserId, testimonialId, {
        publishedAt: published ? timestamp : null,
        hiddenAt: published ? null : timestamp,
        updatedAt: timestamp
      });
      if (!updated) throw new TestimonialError('TESTIMONIAL_NOT_OWNED', 'The testimonial was not found for this owner.');
      return updated;
    },

    async removeOwnedTestimonial(ownerUserId: string, testimonialId: string) {
      const removed = await repository.softDeleteOwned(ownerUserId, testimonialId, now());
      if (!removed) throw new TestimonialError('TESTIMONIAL_NOT_OWNED', 'The testimonial was not found for this owner.');
      return true;
    },

    listOwnedTestimonials(ownerUserId: string) {
      return repository.listOwned(ownerUserId);
    },

    listPublicTestimonials(subdomain: string) {
      return repository.listPublic(subdomain);
    },

    async exportOwnedTestimonials(ownerUserId: string) {
      return (await repository.listOwned(ownerUserId)).map(exportedTestimonial);
    },

    async exportOwnedBusinessTestimonials(ownerUserId: string) {
      const records = await repository.listOwned(ownerUserId);
      const businessIds = [...new Set(records.map((testimonial) => testimonial.businessId))];
      return {
        schemaVersion: 'sitterfolio.business-testimonials.v1' as const,
        exportedAt: now().toISOString(),
        businesses: businessIds.map((businessId) => ({
          businessId,
          testimonials: records.filter((testimonial) => testimonial.businessId === businessId).map(exportedTestimonial)
        }))
      };
    }
  };
}

export function createMemoryTestimonialRepository(initialSites: TestimonialSite[]): TestimonialRepository {
  const testimonials: Testimonial[] = [];
  const findOwnedTestimonialIndex = (ownerUserId: string, testimonialId: string) => testimonials.findIndex((testimonial) => testimonial.id === testimonialId && !testimonial.deletedAt && initialSites.some((site) => site.id === testimonial.siteId && site.ownerUserId === ownerUserId));
  return {
    async findOwnedSite(ownerUserId, subdomain) {
      return initialSites.find((site) => site.ownerUserId === ownerUserId && site.subdomain === subdomain) ?? null;
    },
    async create(input) {
      const testimonial = { ...input, id: crypto.randomUUID() };
      testimonials.push(testimonial);
      return testimonial;
    },
    async updateOwned(ownerUserId, testimonialId, update) {
      const index = findOwnedTestimonialIndex(ownerUserId, testimonialId);
      if (index < 0) return null;
      testimonials[index] = { ...testimonials[index], ...update };
      return testimonials[index];
    },
    async setPublishedOwned(ownerUserId, testimonialId, update) {
      const index = findOwnedTestimonialIndex(ownerUserId, testimonialId);
      if (index < 0) return null;
      testimonials[index] = { ...testimonials[index], ...update };
      return testimonials[index];
    },
    async softDeleteOwned(ownerUserId, testimonialId, deletedAt) {
      const index = findOwnedTestimonialIndex(ownerUserId, testimonialId);
      if (index < 0) return false;
      testimonials[index] = { ...testimonials[index], deletedAt, publishedAt: null, updatedAt: deletedAt };
      return true;
    },
    async listOwned(ownerUserId) {
      return testimonials.filter((testimonial) => !testimonial.deletedAt && initialSites.some((site) => site.id === testimonial.siteId && site.ownerUserId === ownerUserId));
    },
    async listPublic(subdomain) {
      return testimonials.filter((testimonial) => !testimonial.deletedAt && testimonial.publishedAt && initialSites.some((site) => site.id === testimonial.siteId && site.subdomain === subdomain));
    }
  };
}

export const trustReferralEligibility = createTrustReferralEligibility();
