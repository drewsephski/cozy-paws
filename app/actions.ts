'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { siteIntake } from '@/lib/intake';
import { profiles, type BusinessProfile } from '@/lib/profiles';
import { getSession } from '@/lib/session';

async function requireUser(callbackURL = '/admin') {
  const session = await getSession();
  if (!session) redirect(`/auth?callbackURL=${encodeURIComponent(callbackURL)}`);
  return session.user;
}

export type DraftAddressState = {
  success?: boolean;
  error?: string;
  subdomain?: string;
  icon?: string;
};

export async function checkDraftAddressAction(
  _prevState: DraftAddressState,
  formData: FormData
): Promise<DraftAddressState> {
  return siteIntake.checkAddress(Object.fromEntries(formData));
}

export type LaunchDraftState = { error?: string };

export async function launchDraftAction(
  _prevState: LaunchDraftState,
  formData: FormData
): Promise<LaunchDraftState> {
  const user = await requireUser('/launch');
  const result = await siteIntake.launch(user.id, Object.fromEntries(formData));
  if (!result.success) return { error: result.error };

  revalidatePath(`/s/${result.subdomain}`);
  redirect(`/admin/complete?site=${encodeURIComponent(result.subdomain)}`);
}

export type SaveProfileState = { success?: boolean; error?: string; savedAt?: number };

export async function saveProfileAction(
  _prevState: SaveProfileState,
  formData: FormData
): Promise<SaveProfileState> {
  const user = await requireUser();
  const subdomain = String(formData.get('subdomain') || '');
  const updates: Partial<Omit<BusinessProfile, 'ownerId' | 'createdAt'>> = {};
  const textFields = [
    ['businessName', 80],
    ['tagline', 160],
    ['location', 240],
    ['phone', 40],
    ['email', 120]
  ] as const;

  for (const [name, maximumLength] of textFields) {
    if (formData.has(name)) {
      updates[name] = String(formData.get(name) || '').trim().slice(0, maximumLength);
    }
  }

  if (formData.has('services')) {
    updates.services = String(formData.get('services') || '')
      .split(',')
      .map((service) => service.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  const updated = await profiles.updateOwned(user.id, subdomain, updates);
  if (!updated) return { error: 'This site could not be found. Refresh and try again.' };

  revalidatePath(`/s/${updated.subdomain}`);
  return { success: true, savedAt: Date.now() };
}

export async function completeOnboardingAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const updated = await profiles.updateOwned(
    user.id,
    String(formData.get('subdomain') || ''),
    { onboardingCompletedAt: Date.now() }
  );

  if (!updated) redirect('/admin');

  revalidatePath(`/s/${updated.subdomain}`);
  redirect(`/admin/complete?site=${encodeURIComponent(updated.subdomain)}`);
}

export async function createLeadAction(formData: FormData): Promise<void> {
  const subdomain = String(formData.get('subdomain') || '');
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  if (!subdomain || !name || !email) return;

  const savedSubdomain = await profiles.recordLead(subdomain, {
    name,
    email,
    dates: String(formData.get('dates') || ''),
    message: String(formData.get('message') || '')
  });
  if (!savedSubdomain) return;

  revalidatePath(`/s/${savedSubdomain}`);
  revalidatePath('/admin');
}

export async function saveProfileImageAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const imageUrl = String(formData.get('imageUrl') || '');
  if (!imageUrl.startsWith('https://')) return;

  const updated = await profiles.updateOwned(
    user.id,
    String(formData.get('subdomain') || ''),
    { profileImageUrl: imageUrl }
  );
  if (!updated) return;

  revalidatePath('/admin');
  revalidatePath(`/s/${updated.subdomain}`);
}

type DeleteState = { error?: string; success?: string };

export async function deleteSubdomainAction(
  _prevState: DeleteState,
  formData: FormData
): Promise<DeleteState> {
  const user = await requireUser();
  const deleted = await profiles.deleteOwned(
    user.id,
    String(formData.get('subdomain') || '')
  );
  if (!deleted) return { error: 'This site could not be found.' };

  revalidatePath('/admin');
  return { success: 'Domain deleted successfully' };
}
