import type { PoolClient } from 'pg';
import { transaction, type TransactionRunner } from '../db';
import { normalizeReviewedProfilePatch, type ReviewedProfilePatch } from '../domain/profile-content';
import type { ProfileRecord } from '../profile-ownership';
import { readProfileForUpdate, writeOwnedProfileInTransaction } from '../postgres-profile-repository';
import { RoverImportError } from './types';

export type ApplyOwnedProfileInput = {
  ownerId: string;
  subdomain: string;
  expectedRevision: number;
  reviewed: ReviewedProfilePatch;
};
export type ReviewedProfileWriter = { applyOwned(input: ApplyOwnedProfileInput): Promise<ProfileRecord> };

function mergeProfile(current: ProfileRecord, raw: ReviewedProfilePatch): ProfileRecord {
  const patch = normalizeReviewedProfilePatch(raw);
  const merged = { ...current, ...patch };
  if (!patch.services) {
    merged.services = current.services;
    merged.serviceDetails = current.serviceDetails;
  } else {
    merged.serviceDetails = patch.serviceDetails ?? {};
  }
  return merged;
}

function matchesApplied(current: ProfileRecord, input: ApplyOwnedProfileInput) {
  const expected = mergeProfile({ ...current, profileRevision: input.expectedRevision }, input.reviewed);
  const fields = Object.keys(normalizeReviewedProfilePatch(input.reviewed)) as Array<keyof ProfileRecord>;
  return current.profileRevision === input.expectedRevision + 1 && fields.every((field) => JSON.stringify(current[field]) === JSON.stringify(expected[field]));
}

export function createMemoryReviewedProfileWriter(initial: ProfileRecord[]): ReviewedProfileWriter {
  const records = new Map(initial.map((profile) => [profile.subdomain, { ...profile }]));
  return {
    async applyOwned(input) {
      const current = records.get(input.subdomain);
      if (!current || current.ownerId !== input.ownerId) throw new RoverImportError('SITE_NOT_OWNED');
      if (current.profileRevision !== input.expectedRevision) {
        if (matchesApplied(current, input)) return { ...current };
        throw new RoverImportError('PROFILE_CHANGED');
      }
      const merged = { ...mergeProfile(current, input.reviewed), profileRevision: current.profileRevision + 1 };
      records.set(input.subdomain, merged);
      return { ...merged };
    }
  };
}

async function applyTransaction(client: PoolClient, input: ApplyOwnedProfileInput) {
  const current = await readProfileForUpdate(client, input.subdomain);
  if (!current || current.ownerId !== input.ownerId) throw new RoverImportError('SITE_NOT_OWNED');
  if (current.profileRevision !== input.expectedRevision) {
    if (matchesApplied(current, input)) return current;
    throw new RoverImportError('PROFILE_CHANGED');
  }
  const merged = mergeProfile(current, input.reviewed);
  const updated = await writeOwnedProfileInTransaction(client, input.subdomain, merged);
  if (!updated) throw new RoverImportError('SITE_NOT_OWNED');
  return updated;
}

export function createPostgresReviewedProfileWriter(run: TransactionRunner = transaction): ReviewedProfileWriter {
  return { applyOwned: (input) => run((client) => applyTransaction(client, input)) };
}
