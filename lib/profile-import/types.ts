import type { ReviewedProfilePatch } from '../domain/profile-content';

export const ROVER_IMPORT_ERROR_CODES = [
  'INVALID_URL', 'ATTESTATION_REQUIRED', 'AUTHENTICATION_REQUIRED', 'SITE_NOT_OWNED',
  'POC_DISABLED', 'PROVIDER_NOT_CONFIGURED', 'RATE_LIMITED', 'ATTEMPT_ACTIVE',
  'ATTEMPT_ALREADY_USED', 'CAPTURE_TIMEOUT', 'CAPTURE_FAILED', 'CAPTURE_TOO_LARGE',
  'ANALYSIS_TIMEOUT', 'ANALYSIS_UNAVAILABLE', 'ANALYSIS_INVALID', 'NO_VISIBLE_PROFILE_CONTENT',
  'PROFILE_CHANGED', 'INVALID_REVIEW', 'PHOTO_INVALID', 'APPLY_FAILED'
] as const;

export type RoverImportErrorCode = typeof ROVER_IMPORT_ERROR_CODES[number];

export class RoverImportError extends Error {
  constructor(readonly code: RoverImportErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RoverImportError';
  }
}

export type ImportConfidence = 'high' | 'medium';
export type ReviewField<T = string> = { value: T; confidence: ImportConfidence };
export type ServiceFieldConfidence = Partial<Record<'name' | 'description' | 'startingPrice' | 'billingUnit', ImportConfidence>>;

export type RoverReviewDraft = {
  attemptId: string;
  subdomain: string;
  canonicalRoverUrl: string;
  expectedProfileRevision: number;
  current: ReviewedProfilePatch;
  reviewed: ReviewedProfilePatch;
  confidence: Partial<Record<keyof ReviewedProfilePatch, ImportConfidence>>;
  serviceConfidence?: Record<string, ServiceFieldConfidence>;
  portrait?: { bytes: Uint8Array; mediaType: 'image/webp' };
  portraitWarning?: string;
  expiresAt: number;
};

export type CapturedPage = { bytes: Uint8Array; mediaType: string; width: number; height: number };
export type ScreenshotSlice = { index: number; top: number; width: number; height: number; bytes: Uint8Array; mediaType: 'image/jpeg' };

export type PageCapture = { capture(url: string, signal: AbortSignal): Promise<CapturedPage> };
export type ProfileVisionResult = {
  reviewed: ReviewedProfilePatch;
  confidence: Partial<Record<keyof ReviewedProfilePatch, ImportConfidence>>;
  serviceConfidence?: Record<string, ServiceFieldConfidence>;
  portrait?: { sliceIndex: number; confidence: 'high' | 'medium' | 'low'; box: { x: number; y: number; width: number; height: number } };
};
export type ProfileVision = { extract(slices: ScreenshotSlice[], signal: AbortSignal): Promise<ProfileVisionResult> };
