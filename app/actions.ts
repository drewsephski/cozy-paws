'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { siteIntake } from '@/lib/intake';
import { profiles, type BusinessProfile } from '@/lib/profiles';
import { getSession } from '@/lib/session';
import { leadIntake, leadRateLimitKey } from '@/lib/leads';
import { createPaymentRequestForLead, deliverPaymentRequest } from '@/lib/payment-requests';
import { getAppOrigin } from '@/lib/app-url';
import { createOrContinueOnboarding } from '@/lib/connected-accounts';
import { transitionOwnedLead } from '@/lib/lead-management';

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
    ['email', 120],
    ['paymentLinkUrl', 500]
  ] as const;

  for (const [name, maximumLength] of textFields) {
    if (formData.has(name)) {
      updates[name] = String(formData.get(name) || '').trim().slice(0, maximumLength);
    }
  }

  if (updates.paymentLinkUrl) {
    try {
      const url = new URL(updates.paymentLinkUrl);
      if (url.protocol !== 'https:' || !['buy.stripe.com', 'checkout.stripe.com'].includes(url.hostname)) throw new Error();
      updates.paymentLinkUrl = url.toString();
    } catch { return { error: 'Use a valid Stripe Payment Link beginning with https://buy.stripe.com.' }; }
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

export type LeadSubmissionState = { success?: boolean; error?: string };

export async function createLeadAction(
  _prevState: LeadSubmissionState,
  formData: FormData
): Promise<LeadSubmissionState> {
  const subdomain = String(formData.get('subdomain') || '');
  const result = await leadIntake.submit(
    {
      subdomain,
      name: formData.get('name'),
      email: formData.get('email'),
      dates: formData.get('dates'),
      message: formData.get('details'),
      service: formData.get('service'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      petTypes: formData.get('petTypes'),
      petCount: formData.get('petCount'),
      postalCode: formData.get('postalCode'),
      source: formData.get('source'),
      campaign: formData.get('campaign')
    },
    await leadRateLimitKey(subdomain)
  );
  if (!result.success) return { error: result.error };

  revalidatePath(`/s/${result.subdomain}`);
  revalidatePath('/admin');
  return { success: true };
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

export async function markLeadReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const subdomain = String(formData.get('subdomain') || '');
  const leadId = String(formData.get('leadId') || '');
  const marked = await profiles.markLeadRead(user.id, subdomain, leadId);
  if (marked) revalidatePath('/admin');
}

export async function updateLeadStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') || '');
  await transitionOwnedLead(user.id, leadId, formData.get('status'));
  revalidatePath('/admin');
}

export type PaymentRequestState = { error?: string; paymentUrl?: string; customerEmail?: string; delivered?: boolean };
export async function createPaymentRequestAction(_state: PaymentRequestState, formData: FormData): Promise<PaymentRequestState> {
  const user = await requireUser();
  try {
    const dollars = String(formData.get('amount') || '');
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(dollars)) return { error: 'Enter a valid amount.' };
    const payment = await createPaymentRequestForLead(user.id, { leadId: String(formData.get('leadId') || ''), amountCents: Math.round(Number(dollars) * 100), description: String(formData.get('description') || '').trim().slice(0, 200), customerNote: String(formData.get('note') || '').trim().slice(0, 500) });
    const paymentUrl = `${getAppOrigin()}/pay/${payment.publicToken}`;
    try {
      await deliverPaymentRequest(payment.id);
      revalidatePath('/admin');
      return { paymentUrl, customerEmail: payment.customerEmail || undefined, delivered: true };
    } catch {
      revalidatePath('/admin');
      return { paymentUrl, customerEmail: payment.customerEmail || undefined, error: 'Payment request created, but the email could not be sent.' };
    }
  } catch (error) { return { error: error instanceof Error ? error.message : 'Unable to create payment request.' }; }
}

export async function startStripeOnboardingAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const url = await createOrContinueOnboarding(user.id, String(formData.get('businessId') || ''));
  redirect(url);
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
  return { success: 'Site deleted.' };
}
