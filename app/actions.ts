'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { siteIntake } from '@/lib/intake';
import { profiles, type BusinessProfile } from '@/lib/profiles';
import { normalizeServices } from '@/lib/profile-ownership';
import { getSession } from '@/lib/session';
import { leadIntake, leadRateLimitKey, maySendConversationMessage } from '@/lib/leads';
import { createPaymentRequestForLead, deliverPaymentRequest, refreshOwnerPaymentSetup } from '@/lib/payment-requests';
import type { ConnectedAccountStatus } from '@/lib/connected-accounts';
import { getAppOrigin } from '@/lib/app-url';
import { createOrContinueOnboarding } from '@/lib/connected-accounts';
import { transitionOwnedLead } from '@/lib/lead-management';
import { sendCustomerConversationMessage, sendSitterConversationMessage } from '@/lib/conversations';
import { sendConversationMessageNotification } from '@/lib/email';
import { addOwnedClientPet, createClientHouseholdFromOwnedLead, updateOwnedClientHousehold, updateOwnedClientPet } from '@/lib/client-households';
import { createOwnedBooking, transitionOwnedBooking } from '@/lib/bookings';
import { submitAuthenticatedLead } from '@/lib/authenticated-lead-intake';
import { rememberConversationReturn } from '@/lib/conversation-return';
import { isCalendarDate } from '@/lib/calendar-date';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    ['sitterName', 80],
    ['businessName', 80],
    ['tagline', 160],
    ['location', 240],
    ['phone', 40],
    ['email', 120],
    ['meetAndGreetExpectations', 500],
    ['cancellationExpectations', 500]
  ] as const;

  for (const [name, maximumLength] of textFields) {
    if (formData.has(name)) {
      updates[name] = String(formData.get(name) || '').trim().slice(0, maximumLength);
    }
  }

  if ((formData.has('sitterName') || formData.has('businessName')) && !updates.sitterName && !updates.businessName) {
    return { error: 'Add your name or a business name so pet owners know who they are contacting.' };
  }

  if (formData.has('services')) {
    updates.services = normalizeServices(String(formData.get('services') || '').split(','));
  }

  if (formData.has('availabilityStatus')) {
    const status = String(formData.get('availabilityStatus') || '');
    if (!['ACCEPTING', 'LIMITED', 'UNAVAILABLE'].includes(status)) return { error: 'Choose a valid availability status.' };
    updates.availabilityStatus = status as NonNullable<BusinessProfile['availabilityStatus']>;
  }
  if (formData.has('availabilityUntil')) {
    const value = String(formData.get('availabilityUntil') || '');
    if (value && !isCalendarDate(value)) return { error: 'Choose a valid availability date.' };
    updates.availabilityUntil = value || null;
  }
  if (formData.has('yearsExperience')) {
    const value = String(formData.get('yearsExperience') || '').trim();
    const years = value === '' ? null : Number(value);
    if (years !== null && (!Number.isInteger(years) || years < 0 || years > 80)) return { error: 'Years of experience must be from 0 to 80.' };
    updates.yearsExperience = years;
  }
  if (formData.has('careCapabilities')) updates.careCapabilities = normalizeServices(String(formData.get('careCapabilities') || '').split(','), 12);
  if (formData.has('selfReportedCredentials')) updates.selfReportedCredentials = normalizeServices(String(formData.get('selfReportedCredentials') || '').split(','), 12);

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

export type LeadSubmissionState = {
  success?: boolean;
  error?: string;
  conversationToken?: string;
  initialMessage?: string;
  serviceRequested?: string;
  requestedStartDate?: string | null;
  requestedEndDate?: string | null;
  createdAt?: number;
};

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
      campaign: formData.get('campaign'),
      submissionToken: formData.get('submissionToken')
    },
    await leadRateLimitKey(subdomain)
  );
  if (!result.success) return { error: result.error };

  if (result.conversationToken) await rememberConversationReturn(result.subdomain, result.conversationToken);
  revalidatePath(`/s/${result.subdomain}`);
  revalidatePath('/admin');
  return {
    success: true,
    conversationToken: result.conversationToken,
    initialMessage: result.lead.message,
    serviceRequested: result.lead.serviceRequested,
    requestedStartDate: result.lead.requestedStartDate,
    requestedEndDate: result.lead.requestedEndDate,
    createdAt: result.lead.createdAt
  };
}

export async function createAuthenticatedLeadAction(
  _prevState: LeadSubmissionState,
  formData: FormData
): Promise<LeadSubmissionState> {
  const subdomain = String(formData.get('subdomain') || '');
  const session = await getSession();
  const result = await submitAuthenticatedLead(
    session?.user ?? null,
    {
      subdomain,
      details: formData.get('details'),
      submissionToken: formData.get('submissionToken')
    },
    await leadRateLimitKey(subdomain),
    leadIntake.submit
  );
  if (!result.success) return { error: result.error };

  if (result.conversationToken) await rememberConversationReturn(result.subdomain, result.conversationToken);
  revalidatePath(`/s/${result.subdomain}`);
  revalidatePath('/admin');
  return {
    success: true,
    conversationToken: result.conversationToken,
    initialMessage: result.lead.message,
    serviceRequested: result.lead.serviceRequested,
    requestedStartDate: result.lead.requestedStartDate,
    requestedEndDate: result.lead.requestedEndDate,
    createdAt: result.lead.createdAt
  };
}

export type ConversationMessageState = { success?: boolean; error?: string; sentAt?: number };

export async function sendCustomerConversationMessageAction(
  _state: ConversationMessageState,
  formData: FormData
): Promise<ConversationMessageState> {
  const token = String(formData.get('conversationToken') || '');
  try {
    if (!(await maySendConversationMessage(token))) return { error: 'Please wait a moment before sending another message.' };
    const message = await sendCustomerConversationMessage(token, formData.get('message'));
    if (message.sitterEmail) {
      try {
        await sendConversationMessageNotification({
          messageId: message.id,
          conversationToken: token,
          recipientEmail: message.sitterEmail,
          senderName: message.customerName,
          preview: message.body
        });
      } catch (error) {
        console.error(JSON.stringify({ event: 'conversation_notification_failed', messageId: message.id, reason: error instanceof Error ? error.name : 'unknown' }));
      }
    }
    revalidatePath(`/conversation/${token}`);
    revalidatePath('/admin');
    return { success: true, sentAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Your message could not be sent.' };
  }
}

export async function sendSitterConversationMessageAction(
  _state: ConversationMessageState,
  formData: FormData
): Promise<ConversationMessageState> {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') || '');
  try {
    const message = await sendSitterConversationMessage(user.id, leadId, formData.get('message'));
    try {
      await sendConversationMessageNotification({
        messageId: message.id,
        conversationToken: message.publicToken,
        recipientEmail: message.customerEmail,
        replyTo: message.sitterEmail,
        senderName: message.businessName,
        preview: message.body
      });
    } catch (error) {
      console.error(JSON.stringify({ event: 'conversation_notification_failed', messageId: message.id, reason: error instanceof Error ? error.name : 'unknown' }));
    }
    revalidatePath('/admin');
    revalidatePath(`/conversation/${message.publicToken}`);
    return { success: true, sentAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Your reply could not be sent.' };
  }
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

export async function markLeadGroupReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const leadIds = [...new Set(formData.getAll('leadIds').map(String))];
  if (leadIds.length > 100 || leadIds.some((id) => !UUID.test(id))) return;
  const marked = await profiles.markLeadsRead(user.id, leadIds);
  if (marked.length) revalidatePath('/admin');
}

export async function updateLeadStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') || '');
  await transitionOwnedLead(user.id, leadId, formData.get('status'));
  revalidatePath('/admin');
}

export type SaveClientState = { success?: string; error?: string; savedAt?: number; householdId?: string };
export async function saveClientFromLeadAction(_state: SaveClientState, formData: FormData): Promise<SaveClientState> {
  const user = await requireUser();
  try {
    const household = await createClientHouseholdFromOwnedLead(user.id, String(formData.get('leadId') || ''));
    revalidatePath('/admin');
    return { success: `${household.name} is now saved as a client.`, savedAt: Date.now(), householdId: household.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to save this client.' };
  }
}

export type EditClientState = { success?: string; error?: string; savedAt?: number };

export async function updateClientHouseholdAction(_state: EditClientState, formData: FormData): Promise<EditClientState> {
  const user = await requireUser();
  try {
    await updateOwnedClientHousehold(user.id, String(formData.get('householdId') || ''), {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      postalCode: String(formData.get('postalCode') || ''),
      careNotes: String(formData.get('careNotes') || '')
    });
    revalidatePath('/admin');
    return { success: 'Client details saved.', savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to save client details.' };
  }
}

export async function updateClientPetAction(_state: EditClientState, formData: FormData): Promise<EditClientState> {
  const user = await requireUser();
  try {
    await updateOwnedClientPet(user.id, String(formData.get('householdId') || ''), String(formData.get('petId') || ''), {
      name: String(formData.get('name') || ''),
      type: String(formData.get('type') || ''),
      careNotes: String(formData.get('careNotes') || '')
    });
    revalidatePath('/admin');
    return { success: 'Pet profile saved.', savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to save pet profile.' };
  }
}

export async function addClientPetAction(_state: EditClientState, formData: FormData): Promise<EditClientState> {
  const user = await requireUser();
  try {
    const pet = await addOwnedClientPet(user.id, String(formData.get('householdId') || ''), {
      name: String(formData.get('name') || ''),
      type: String(formData.get('type') || ''),
      careNotes: String(formData.get('careNotes') || '')
    });
    revalidatePath('/admin');
    return { success: `${pet.name} added.`, savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to add pet.' };
  }
}

export type CreateBookingState = { success?: string; error?: string; createdAt?: number };
export async function createBookingAction(_state: CreateBookingState, formData: FormData): Promise<CreateBookingState> {
  const user = await requireUser();
  try {
    const dollars = String(formData.get('amount') || '').trim();
    if (!/^\d{1,5}(\.\d{1,2})?$/.test(dollars)) return { error: 'Enter a valid amount from $1 to $10,000.' };
    const amountCents = Math.round(Number(dollars) * 100);
    const booking = await createOwnedBooking(user.id, {
      householdId: String(formData.get('householdId') || ''),
      petIds: formData.getAll('petIds').map(String),
      startDate: String(formData.get('startDate') || ''),
      endDate: String(formData.get('endDate') || ''),
      amountCents,
      notes: String(formData.get('notes') || '')
    });
    revalidatePath('/admin');
    return { success: `Booking saved for ${booking.householdName}.`, createdAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to create this booking.' };
  }
}

export type TransitionBookingState = { error?: string };
export async function transitionBookingAction(_state: TransitionBookingState, formData: FormData): Promise<TransitionBookingState> {
  const user = await requireUser();
  const transitioned = await transitionOwnedBooking(user.id, String(formData.get('bookingId') || ''), formData.get('status'));
  if (!transitioned) return { error: 'Booking status could not be updated. Refresh and try again.' };
  revalidatePath('/admin');
  return {};
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

export type RefreshStripeStatusState = { status?: ConnectedAccountStatus; ready?: boolean; refreshedAt?: number; error?: string };
export async function refreshStripeStatusAction(_state: RefreshStripeStatusState, formData: FormData): Promise<RefreshStripeStatusState> {
  const user = await requireUser();
  try {
    const setup = await refreshOwnerPaymentSetup(user.id, String(formData.get('businessId') || ''));
    revalidatePath('/admin');
    return { status: setup.status, ready: setup.ready, refreshedAt: Date.now() };
  } catch {
    return { error: 'Stripe status could not be refreshed. Try again in a moment.', refreshedAt: Date.now() };
  }
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
