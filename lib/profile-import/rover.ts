import { canonicalizeRoverProfileUrl } from '../domain/rover-profile-url';
import { normalizeReviewedProfilePatch, type ReviewedProfilePatch } from '../domain/profile-content';
import type { ProfileRecord } from '../profile-ownership';
import type { ImportAdmission } from './admission';
import { createScreenshotSlices } from './screenshot-slices';
import type { ReviewedProfileWriter } from './profile-writer';
import { RoverImportError, type PageCapture, type ProfileVision, type RoverReviewDraft } from './types';
import { createHash } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProfileLookup = { getOwned(subdomain: string, ownerId: string): Promise<ProfileRecord | null> };
type SafeLogEvent = Record<string, string | number | boolean | undefined>;
type Dependencies = { profiles: ProfileLookup; admission: ImportAdmission; capture: PageCapture; vision: ProfileVision; writer: ReviewedProfileWriter; now?: () => number; log?: (event: SafeLogEvent) => void };

export type PrepareOwnedReviewInput = {
  ownerId: string; subdomain: string; roverUrl: string; attestationAccepted: true; attemptId: string; signal: AbortSignal;
  onProgress?: (stage: 'capture_active' | 'capture_complete' | 'analysis_active' | 'review_ready') => void;
};
export type ApplyOwnedReviewInput = { ownerId: string; subdomain: string; applyId: string; expectedProfileRevision: number; reviewed: ReviewedProfilePatch };

function currentProfile(profile: ProfileRecord): ReviewedProfilePatch {
  return Object.fromEntries(Object.entries({
    sitterName: profile.sitterName, businessName: profile.businessName, tagline: profile.tagline, location: profile.location,
    services: profile.services, about: profile.about, careRoutine: profile.careRoutine, homeEnvironment: profile.homeEnvironment,
    petPreferences: profile.petPreferences, experienceSummary: profile.experienceSummary, specialCareSummary: profile.specialCareSummary,
    serviceDetails: profile.serviceDetails, phone: profile.phone, email: profile.email, yearsExperience: profile.yearsExperience,
    careCapabilities: profile.careCapabilities, meetAndGreetExpectations: profile.meetAndGreetExpectations,
    cancellationExpectations: profile.cancellationExpectations, selfReportedCredentials: profile.selfReportedCredentials
  }).filter(([, value]) => value !== undefined));
}

export function createRoverProfileImports({ profiles, admission, capture, vision, writer, now = Date.now, log = () => {} }: Dependencies) {
  return {
    async prepareOwnedReview(input: PrepareOwnedReviewInput): Promise<RoverReviewDraft> {
      if (!input.attestationAccepted) throw new RoverImportError('ATTESTATION_REQUIRED');
      if (!UUID.test(input.attemptId)) throw new RoverImportError('INVALID_REVIEW');
      let canonicalRoverUrl: string;
      try { canonicalRoverUrl = canonicalizeRoverProfileUrl(input.roverUrl); } catch { throw new RoverImportError('INVALID_URL'); }
      const profile = await profiles.getOwned(input.subdomain, input.ownerId);
      if (!profile) throw new RoverImportError('SITE_NOT_OWNED');
      const startedAt = now();
      const urlHashPrefix = createHash('sha256').update(canonicalRoverUrl).digest('hex').slice(0, 12);
      log({ event: 'rover_import_started', attemptId: input.attemptId, subdomain: profile.subdomain, urlHashPrefix });
      const token = await admission.acquirePrepare(input.ownerId, profile.subdomain, input.attemptId);
      try {
        input.onProgress?.('capture_active');
        const screenshot = await capture.capture(canonicalRoverUrl, input.signal);
        log({ event: 'rover_capture_completed', attemptId: input.attemptId, subdomain: profile.subdomain, durationMs: now() - startedAt, width: screenshot.width, height: screenshot.height, bytes: screenshot.bytes.byteLength });
        input.onProgress?.('capture_complete');
        const slices = await createScreenshotSlices(screenshot.bytes);
        input.onProgress?.('analysis_active');
        const extraction = await vision.extract(slices, input.signal);
        log({ event: 'rover_analysis_completed', attemptId: input.attemptId, subdomain: profile.subdomain, durationMs: now() - startedAt, sliceCount: slices.length });
        const draft: RoverReviewDraft = {
          attemptId: input.attemptId, subdomain: profile.subdomain, canonicalRoverUrl,
          expectedProfileRevision: profile.profileRevision, current: currentProfile(profile), reviewed: extraction.reviewed,
          confidence: extraction.confidence, serviceConfidence: extraction.serviceConfidence,
          expiresAt: now() + 30 * 60_000
        };
        input.onProgress?.('review_ready');
        return draft;
      } catch (error) {
        log({ event: 'rover_import_failed', attemptId: input.attemptId, subdomain: profile.subdomain, durationMs: now() - startedAt, errorCode: error instanceof RoverImportError ? error.code : 'ANALYSIS_UNAVAILABLE' });
        throw error;
      } finally {
        await admission.releasePrepare(token);
      }
    },

    async applyOwnedReview(input: ApplyOwnedReviewInput) {
      if (!UUID.test(input.applyId)) throw new RoverImportError('INVALID_REVIEW');
      if (!Number.isSafeInteger(input.expectedProfileRevision) || input.expectedProfileRevision < 0) throw new RoverImportError('INVALID_REVIEW');
      const profile = await profiles.getOwned(input.subdomain, input.ownerId);
      if (!profile) throw new RoverImportError('SITE_NOT_OWNED');
      const reviewed = normalizeReviewedProfilePatch(input.reviewed);
      if (!Object.keys(reviewed).length) throw new RoverImportError('INVALID_REVIEW');
      const fingerprint = createHash('sha256').update(JSON.stringify(reviewed)).digest('hex');
      const startedAt = now();
      log({ event: 'rover_import_apply_started', applyId: input.applyId, subdomain: profile.subdomain, expectedRevision: input.expectedProfileRevision });
      const token = await admission.acquireApply(input.ownerId, profile.subdomain);
      try {
        const replay = await admission.readApplyResult(input.ownerId, profile.subdomain, input.applyId);
        if (replay) {
          if (replay.fingerprint !== fingerprint || replay.profileRevision !== profile.profileRevision) throw new RoverImportError('PROFILE_CHANGED');
          log({ event: 'rover_import_applied', applyId: input.applyId, subdomain: profile.subdomain, profileRevision: profile.profileRevision, replay: true, durationMs: now() - startedAt });
          return profile;
        }
        const updated = await writer.applyOwned({ ownerId: input.ownerId, subdomain: profile.subdomain, expectedRevision: input.expectedProfileRevision, reviewed });
        try { await admission.storeApplyResult(input.ownerId, profile.subdomain, input.applyId, { fingerprint, profileRevision: updated.profileRevision }); } catch { /* the committed profile remains authoritative; writer matching still supports exact replay */ }
        log({ event: 'rover_import_applied', applyId: input.applyId, subdomain: profile.subdomain, profileRevision: updated.profileRevision, replay: false, durationMs: now() - startedAt });
        return updated;
      } catch (error) {
        log({ event: 'rover_import_apply_failed', applyId: input.applyId, subdomain: profile.subdomain, durationMs: now() - startedAt, errorCode: error instanceof RoverImportError ? error.code : 'APPLY_FAILED' });
        if (error instanceof RoverImportError) throw error;
        throw new RoverImportError('APPLY_FAILED');
      } finally {
        await admission.releaseApply(token);
      }
    }
  };
}

export type RoverProfileImports = ReturnType<typeof createRoverProfileImports>;
