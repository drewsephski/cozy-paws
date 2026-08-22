import { Resend } from 'resend';
import type { AcceptedLead } from './lead-intake';
import { getAppOrigin } from './app-url';

const bounded = (value: string | undefined, length: number) => (value || '').slice(0, length);

export async function sendNewLeadNotification({ profile, lead }: AcceptedLead) {
  if (!profile?.email || !process.env.RESEND_API_KEY || !process.env.SITTERFOLIO_FROM_EMAIL) return;

  const businessName = bounded(profile.businessName || profile.subdomain, 80);
  const customerName = bounded(lead.name, 120);
  const details = bounded(lead.message, 500);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.SITTERFOLIO_FROM_EMAIL,
    to: profile.email,
    replyTo: lead.email,
    subject: `New inquiry from ${customerName} — ${businessName}`,
    text: [
      `New inquiry for ${businessName}`,
      '',
      `Customer: ${customerName}`,
      `Email: ${bounded(lead.email, 160)}`,
      `Service: ${bounded(lead.serviceRequested, 120) || 'Not specified'}`,
      `Dates: ${bounded([lead.requestedStartDate, lead.requestedEndDate].filter(Boolean).join(' to ') || lead.dates, 120) || 'Not specified'}`,
      `Pets: ${bounded([lead.petCount ? `${lead.petCount} ` : '', lead.petTypes?.join(', ')].join(''), 120) || 'Not specified'}`,
      `Postal code: ${bounded(lead.postalCode, 20) || 'Not specified'}`,
      `Care details: ${details || 'Not provided'}`,
      '',
      `Review the full inquiry in Sitterfolio: ${getAppOrigin()}/admin`
    ].join('\n')
  });
  if (error) throw new Error('resend rejected notification');
}

export type PaymentRequestEmail = { from: string; to: string; replyTo?: string; subject: string; text: string; idempotencyKey: string };
export type EmailSender = (email: PaymentRequestEmail) => Promise<void>;

export const sendWithResend: EmailSender = async (email) => {
  if (!process.env.RESEND_API_KEY || !process.env.SITTERFOLIO_FROM_EMAIL) throw new Error('Email delivery is not configured');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { idempotencyKey, ...payload } = email;
  const { error } = await resend.emails.send(payload, { idempotencyKey });
  if (error) throw new Error('resend rejected notification');
};

export async function sendPaymentRequestNotification(input: { paymentRequestId: string; publicToken: string; businessName: string; sitterEmail?: string | null; customerEmail: string; description: string; amountCents: number; customerNote?: string | null }, sender: EmailSender = sendWithResend) {
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(input.amountCents / 100);
  await sender({ from: process.env.SITTERFOLIO_FROM_EMAIL || '', to: input.customerEmail, replyTo: input.sitterEmail || undefined, subject: `Payment request from ${input.businessName} — ${amount}`, idempotencyKey: `payment-request/${input.paymentRequestId}`, text: [`${input.businessName} sent you a payment request.`, '', `Service: ${input.description}`, `Total: ${amount}`, ...(input.customerNote ? [`Note from your sitter: ${input.customerNote}`] : []), '', `Pay securely through Stripe: ${getAppOrigin()}/pay/${input.publicToken}`, '', 'Your payment is processed securely through Stripe. Reply to this email to contact your sitter.'].join('\n') });
}
