import { normalizeSubdomain, type ProfileOwnership } from './profile-ownership';

export const PROFILE_IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function isProfileImageContentType(value: string) {
  return PROFILE_IMAGE_CONTENT_TYPES.some((contentType) => contentType === value);
}

export function profileImagePath(subdomain: string, filename: string) {
  const basename = filename.replaceAll('\\', '/').split('/').pop() || 'profile-image';
  return `${profileImageDirectory(subdomain)}${basename}`;
}

const profileImageDirectory = (subdomain: string) =>
  `profiles/${normalizeSubdomain(subdomain)}/`;

type UploadAuthorizationInput = {
  userId: string;
  pathname: string;
  clientPayload: string | null;
};

export function createUploadAuthorization(profiles: ProfileOwnership) {
  return {
    async authorize({ userId, pathname, clientPayload }: UploadAuthorizationInput) {
      let payload: unknown;
      try {
        payload = JSON.parse(clientPayload || '{}');
      } catch {
        throw new Error('Invalid upload payload');
      }

      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Invalid upload payload');
      }

      const subdomainValue = Reflect.get(payload, 'subdomain');
      if (typeof subdomainValue !== 'string') {
        throw new Error('Invalid upload payload');
      }

      const subdomain = normalizeSubdomain(subdomainValue);
      const ownedProfile = await profiles.getOwned(subdomain, userId);
      const prefix = profileImageDirectory(subdomain);
      const filename = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';

      if (
        !subdomain ||
        !ownedProfile ||
        !filename ||
        filename === '.' ||
        filename === '..' ||
        filename.includes('/')
      ) {
        throw new Error('Invalid upload request');
      }

      return {
        allowedContentTypes: [...PROFILE_IMAGE_CONTENT_TYPES],
        maximumSizeInBytes: PROFILE_IMAGE_MAX_BYTES,
        addRandomSuffix: true as const,
        tokenPayload: clientPayload
      };
    }
  };
}

export type UploadAuthorization = ReturnType<typeof createUploadAuthorization>;
