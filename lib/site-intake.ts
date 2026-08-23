import { isPetIconId } from './pet-icons';
import { normalizeSubdomain, type ProfileOwnership } from './profile-ownership';

export type DraftAddressInput = {
  subdomain?: unknown;
  icon?: unknown;
};

export type SiteDraftInput = DraftAddressInput & {
  sitterName?: unknown;
  businessName?: unknown;
  tagline?: unknown;
  location?: unknown;
  services?: unknown;
  email?: unknown;
  phone?: unknown;
};

const readString = (value: unknown) => String(value || '');

function isValidIcon(value: string) {
  if (isPetIconId(value)) return true;
  if (value.length > 10) return false;

  try {
    if (/[\p{Emoji}]/u.test(value)) return true;
  } catch (error) {
    console.warn('Emoji regex validation failed, using fallback validation', error);
  }

  return value.length >= 1 && value.length <= 10;
}

export function createSiteIntake(profiles: ProfileOwnership, now = Date.now) {
  return {
    async checkAddress(input: DraftAddressInput) {
      const subdomain = readString(input.subdomain);
      const icon = readString(input.icon);
      if (!subdomain || !icon) {
        return { success: false as const, error: 'Enter a site address and choose a pet icon.' };
      }

      if (!isValidIcon(icon)) {
        return {
          subdomain,
          icon,
          success: false as const,
          error: 'Choose a valid pet icon.'
        };
      }

      const normalized = normalizeSubdomain(subdomain);
      if (normalized.length < 3 || normalized.length > 30) {
        return {
          subdomain,
          icon,
          success: false as const,
          error: 'Choose a name between 3 and 30 characters.'
        };
      }

      if (normalized !== subdomain) {
        return {
          subdomain,
          icon,
          success: false as const,
          error: 'Use only lowercase letters, numbers, and hyphens.'
        };
      }

      if (await profiles.get(normalized)) {
        return {
          subdomain,
          icon,
          success: false as const,
          error: 'That site address is already taken.'
        };
      }

      return { success: true as const, subdomain: normalized, icon };
    },

    async launch(ownerId: string, draft: SiteDraftInput) {
      const subdomain = readString(draft.subdomain).toLowerCase();
      const icon = readString(draft.icon);
      const normalized = normalizeSubdomain(subdomain);
      const sitterName = readString(draft.sitterName).trim().slice(0, 80);
      const businessName = readString(draft.businessName).trim().slice(0, 80);
      const tagline = readString(draft.tagline).trim().slice(0, 160);
      const location = readString(draft.location).trim().slice(0, 240);
      const email = readString(draft.email).trim().slice(0, 120);
      const phone = readString(draft.phone).trim().slice(0, 40);
      const services = readString(draft.services)
        .split(',')
        .map((service) => service.trim())
        .filter(Boolean)
        .slice(0, 8);

      if (
        normalized !== subdomain ||
        subdomain.length < 3 ||
        subdomain.length > 30 ||
        !isValidIcon(icon)
      ) {
        return {
          success: false as const,
          error: 'Your draft address is invalid. Return to the home page and choose another.'
        };
      }

      if (
        (!sitterName && !businessName) ||
        !tagline ||
        !location ||
        !services.length ||
        !email ||
        !/^\S+@\S+\.\S+$/.test(email)
      ) {
        return {
          success: false as const,
          error: 'Your draft is incomplete. Return to the builder and finish the required details.'
        };
      }

      const timestamp = now();
      const created = await profiles.create(ownerId, normalized, {
        emoji: icon,
        createdAt: timestamp,
        sitterName,
        businessName,
        tagline,
        location,
        services,
        phone,
        email,
        onboardingCompletedAt: timestamp
      });

      if (!created) {
        return {
          success: false as const,
          error: 'That site address was just taken. Choose another address to launch.'
        };
      }

      return { success: true as const, subdomain: created.subdomain };
    }
  };
}

export type SiteIntake = ReturnType<typeof createSiteIntake>;
