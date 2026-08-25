import type { ReviewedProfilePatch } from '../domain/profile-content';

export const ROVER_IMPORT_ERROR_CODES = [
  'INVALID_URL', 'ATTESTATION_REQUIRED', 'AUTHENTICATION_REQUIRED', 'SITE_NOT_OWNED',
  'POC_DISABLED', 'PROVIDER_NOT_CONFIGURED', 'ADMISSION_UNAVAILABLE', 'ATTEMPT_ACTIVE',
  'ATTEMPT_ALREADY_USED', 'CAPTURE_TIMEOUT', 'CAPTURE_FAILED', 'CAPTURE_TOO_LARGE',
  'ANALYSIS_TIMEOUT', 'ANALYSIS_UNAVAILABLE', 'ANALYSIS_INVALID', 'NO_VISIBLE_PROFILE_CONTENT',
  'PROFILE_CHANGED', 'INVALID_REVIEW', 'APPLY_FAILED'
] as const;

export type RoverImportErrorCode = typeof ROVER_IMPORT_ERROR_CODES[number];

export class RoverImportError extends Error {
  constructor(readonly code: RoverImportErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RoverImportError';
  }
}

export type ImportConfidence = 'high' | 'medium';
export const VISIBLE_SOURCE_MAX_LENGTH = 240;
export type VisibleSourceEvidence = string & { readonly __visibleSourceEvidence: unique symbol };
export type ServiceFieldName = 'name' | 'description' | 'startingPrice' | 'billingUnit';
export type ReviewField<T = string> = { value: T; confidence: ImportConfidence; evidence: VisibleSourceEvidence };
export type ServiceFieldConfidence = Partial<Record<ServiceFieldName, ImportConfidence>>;
export type ProfileFieldEvidence = Partial<Record<keyof ReviewedProfilePatch, VisibleSourceEvidence>>;
export type ServiceFieldEvidence = Partial<Record<ServiceFieldName, VisibleSourceEvidence>>;
export type RoverReviewEvidence = {
  profile: ProfileFieldEvidence;
  services: Record<string, ServiceFieldEvidence>;
};

export type RoverReviewDraft = {
  attemptId: string;
  subdomain: string;
  canonicalRoverUrl: string;
  expectedProfileRevision: number;
  current: ReviewedProfilePatch;
  reviewed: ReviewedProfilePatch;
  confidence: Partial<Record<keyof ReviewedProfilePatch, ImportConfidence>>;
  serviceConfidence?: Record<string, ServiceFieldConfidence>;
  evidence?: RoverReviewEvidence;
  expiresAt: number;
};

export type CapturedPage = { bytes: Uint8Array; mediaType: string; width: number; height: number };
export type ScreenshotSlice = { index: number; top: number; width: number; height: number; bytes: Uint8Array; mediaType: 'image/jpeg' };

export type PageCapture = { capture(url: string, signal: AbortSignal): Promise<CapturedPage> };
export type ProfileVisionResult = {
  reviewed: ReviewedProfilePatch;
  confidence: Partial<Record<keyof ReviewedProfilePatch, ImportConfidence>>;
  serviceConfidence?: Record<string, ServiceFieldConfidence>;
  evidence?: RoverReviewEvidence;
};
export type ProfileVision = { extract(slices: ScreenshotSlice[], signal: AbortSignal): Promise<ProfileVisionResult> };
