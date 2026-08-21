'use server';

import { redis } from '@/lib/redis';
import { isValidIcon } from '@/lib/subdomains';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

async function requireUser() {
  const session = await getSession();
  if (!session) redirect('/auth?callbackURL=%2Fadmin');
  return session.user;
}

async function getOwnedProfile(subdomain: string, userId: string) {
  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const current = await redis.get<Record<string, unknown>>(`subdomain:${sanitizedSubdomain}`);
  if (!current || current.ownerId !== userId) return null;
  return { subdomain: sanitizedSubdomain, current };
}

export async function createSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const user = await requireUser();
  const subdomain = formData.get('subdomain') as string;
  const icon = formData.get('icon') as string;

  if (!subdomain || !icon) {
    return { success: false, error: 'Subdomain and icon are required' };
  }

  if (!isValidIcon(icon)) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'Please enter a valid emoji (maximum 10 characters)'
    };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain.length < 3 || sanitizedSubdomain.length > 30) {
    return { subdomain, icon, success: false, error: 'Choose a name between 3 and 30 characters.' };
  }

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const subdomainAlreadyExists = await redis.get(
    `subdomain:${sanitizedSubdomain}`
  );
  if (subdomainAlreadyExists) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  await redis.set(`subdomain:${sanitizedSubdomain}`, {
    ownerId: user.id,
    emoji: icon,
    createdAt: Date.now(),
    businessName: '',
    tagline: '',
    location: '',
    services: [],
    phone: '',
    email: '',
    onboardingCompletedAt: null
  });
  await redis.sadd(`owner:${user.id}:subdomains`, sanitizedSubdomain);

  redirect('/admin');
}

export type SaveProfileState = { success?: boolean; error?: string; savedAt?: number };

export async function saveProfileAction(
  _prevState: SaveProfileState,
  formData: FormData
): Promise<SaveProfileState> {
  const user = await requireUser();
  const subdomain = String(formData.get('subdomain') || '');
  const ownedProfile = await getOwnedProfile(subdomain, user.id);
  if (!ownedProfile) return { error: 'This site could not be found. Refresh and try again.' };
  const { current, subdomain: ownedSubdomain } = ownedProfile;

  const readValue = (name: string, maximumLength: number) =>
    formData.has(name)
      ? String(formData.get(name) || '').trim().slice(0, maximumLength)
      : current[name];

  const services = formData.has('services')
    ? String(formData.get('services') || '')
        .split(',')
        .map((service) => service.trim())
        .filter(Boolean)
        .slice(0, 8)
    : current.services;

  await redis.set(`subdomain:${ownedSubdomain}`, {
    ...current,
    businessName: readValue('businessName', 80),
    tagline: readValue('tagline', 160),
    location: readValue('location', 240),
    phone: readValue('phone', 40),
    email: readValue('email', 120),
    services
  });
  revalidatePath(`/s/${ownedSubdomain}`);
  return {
    success: true,
    savedAt: Date.now()
  };
}

export async function completeOnboardingAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const subdomain = String(formData.get('subdomain') || '');
  const ownedProfile = await getOwnedProfile(subdomain, user.id);

  if (!ownedProfile) {
    redirect('/admin');
  }

  const { current, subdomain: ownedSubdomain } = ownedProfile;

  await redis.set(`subdomain:${ownedSubdomain}`, {
    ...current,
    onboardingCompletedAt: Date.now()
  });
  revalidatePath(`/s/${ownedSubdomain}`);
  redirect(`/admin/complete?site=${encodeURIComponent(ownedSubdomain)}`);
}

export async function createLeadAction(formData: FormData): Promise<void> {
  const subdomain = String(formData.get('subdomain') || '');
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  if (!subdomain || !name || !email) return;
  const leads = (await redis.get<Array<Record<string, unknown>>>(`leads:${subdomain}`)) || [];
  await redis.set(`leads:${subdomain}`, [{ name, email, dates: String(formData.get('dates') || ''), message: String(formData.get('message') || ''), createdAt: Date.now() }, ...leads].slice(0, 100));
  revalidatePath(`/s/${subdomain}`);
  revalidatePath('/admin');
}

export async function saveProfileImageAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const subdomain = String(formData.get('subdomain') || '');
  const imageUrl = String(formData.get('imageUrl') || '');
  const ownedProfile = await getOwnedProfile(subdomain, user.id);
  if (!ownedProfile || !imageUrl.startsWith('https://')) return;
  const { current, subdomain: ownedSubdomain } = ownedProfile;
  await redis.set(`subdomain:${ownedSubdomain}`, { ...current, profileImageUrl: imageUrl });
  revalidatePath('/admin');
  revalidatePath(`/s/${ownedSubdomain}`);
}

export async function deleteSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const user = await requireUser();
  const subdomain = String(formData.get('subdomain') || '');
  const ownedProfile = await getOwnedProfile(subdomain, user.id);
  if (!ownedProfile) return { error: 'This site could not be found.' };
  await redis.del(`subdomain:${ownedProfile.subdomain}`);
  await redis.srem(`owner:${user.id}:subdomains`, ownedProfile.subdomain);
  revalidatePath('/admin');
  return { success: 'Domain deleted successfully' };
}
