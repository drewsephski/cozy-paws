import { RoverImportError, type RoverImportErrorCode } from '@/lib/profile-import/types';

const STATUS: Partial<Record<RoverImportErrorCode, number>> = {
  AUTHENTICATION_REQUIRED: 401, SITE_NOT_OWNED: 404, INVALID_URL: 400, ATTESTATION_REQUIRED: 400,
  INVALID_REVIEW: 400, POC_DISABLED: 404, PROVIDER_NOT_CONFIGURED: 503,
  ADMISSION_UNAVAILABLE: 503, ATTEMPT_ACTIVE: 409, ATTEMPT_ALREADY_USED: 409, PROFILE_CHANGED: 409,
  CAPTURE_TIMEOUT: 504, ANALYSIS_TIMEOUT: 504, CAPTURE_TOO_LARGE: 422
};

const COPY: Record<RoverImportErrorCode, string> = {
  INVALID_URL: 'Paste a valid Rover public profile URL.', ATTESTATION_REQUIRED: 'Confirm that you own this Rover profile and may import its visible content.',
  AUTHENTICATION_REQUIRED: 'Sign in before importing.', SITE_NOT_OWNED: 'That site could not be found.',
  POC_DISABLED: 'Rover import is unavailable here.', PROVIDER_NOT_CONFIGURED: 'Rover import is not configured in this environment.',
  ADMISSION_UNAVAILABLE: 'Rover import is temporarily unavailable. Your site was not changed.', ATTEMPT_ACTIVE: 'An import is already running for this site.',
  ATTEMPT_ALREADY_USED: 'Start a fresh import attempt.', CAPTURE_TIMEOUT: 'Rover took too long to capture. Your site was not changed.',
  CAPTURE_FAILED: 'We could not capture that Rover profile. Your site was not changed.', CAPTURE_TOO_LARGE: 'That profile page was too large to import safely.',
  ANALYSIS_TIMEOUT: 'Profile analysis took too long. Your site was not changed.', ANALYSIS_UNAVAILABLE: 'Profile analysis is temporarily unavailable. Your site was not changed.',
  ANALYSIS_INVALID: 'We could not confidently organize that profile. Your site was not changed.', NO_VISIBLE_PROFILE_CONTENT: 'We could not find supported visible profile content.',
  PROFILE_CHANGED: 'Your profile changed after this review began. Restart the import to compare the latest version.',
  INVALID_REVIEW: 'Review the imported details and try again.', APPLY_FAILED: 'We could not apply the import. Your site was not changed.'
};

export function safeImportError(error: unknown) {
  const code: RoverImportErrorCode = error instanceof RoverImportError ? error.code : 'APPLY_FAILED';
  return { code, message: COPY[code], status: STATUS[code] ?? 502 };
}
