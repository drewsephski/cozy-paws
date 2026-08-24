const LINKEDIN_PROFILE_ERROR =
  'Enter an HTTPS LinkedIn personal profile URL like https://www.linkedin.com/in/your-name.';

export function normalizeLinkedInProfileUrl(value: unknown): string | null {
  const submitted = String(value ?? '').trim();
  if (!submitted) return null;
  if (submitted.length > 500) throw new Error(LINKEDIN_PROFILE_ERROR);

  let url: URL;
  try {
    url = new URL(submitted);
  } catch {
    throw new Error(LINKEDIN_PROFILE_ERROR);
  }

  const hostname = url.hostname.toLowerCase();
  const profilePath = url.pathname.match(/^\/in\/([^/]+)\/?$/i);
  let profileSlug: string | undefined;
  try {
    profileSlug = profilePath ? decodeURIComponent(profilePath[1]) : undefined;
  } catch {
    throw new Error(LINKEDIN_PROFILE_ERROR);
  }

  if (
    url.protocol !== 'https:' ||
    (hostname !== 'linkedin.com' && !hostname.endsWith('.linkedin.com')) ||
    url.username ||
    url.password ||
    url.port ||
    !profileSlug ||
    !/^[\p{L}\p{N}._~-]+$/u.test(profileSlug)
  ) {
    throw new Error(LINKEDIN_PROFILE_ERROR);
  }

  return `https://www.linkedin.com/in/${encodeURIComponent(profileSlug)}`;
}
