import { Resend } from 'resend';
import type { AcceptedLead } from './lead-intake';
import { getAppOrigin } from './app-url';
import { renderSitterfolioEmail } from './email-template';

const bounded = (value: string | undefined, length: number) => (value || '').slice(0, length);

export type PasswordResetEmail = { to: string; subject: string; text: string; html: string };
export type PasswordResetEmailSender = (email: PasswordResetEmail) => Promise<void>;

function passwordResetHtml(url: string) {
  return renderSitterfolioEmail({
    preview: 'Choose a new Sitterfolio password. This link expires in 30 minutes.',
    title: 'Choose a new password',
    intro: 'We received a request to reset your Sitterfolio password.',
    action: { label: 'Reset my password', url },
    notice: 'For your security: this link expires in 30 minutes and can only be used once. If you did not request this, you can safely ignore this email.',
    footer: 'A secure account message from Sitterfolio'
  });
}

const sendPasswordResetWithResend: PasswordResetEmailSender = async (email) => {
  if (!process.env.RESEND_API_KEY || !process.env.SITTERFOLIO_FROM_EMAIL) {
    throw new Error('Email delivery is not configured');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.SITTERFOLIO_FROM_EMAIL,
    ...email
  });
  if (error) throw new Error('resend rejected password reset email');
};

export async function sendPasswordResetEmail(
  input: { email: string; url: string },
  sender: PasswordResetEmailSender = sendPasswordResetWithResend
) {
  await sender({
    to: input.email,
    subject: 'Reset your Sitterfolio password',
    html: passwordResetHtml(input.url),
    text: [
      'We received a request to reset your Sitterfolio password.',
      '',
      `Choose a new password: ${input.url}`,
      '',
      'This link expires in 30 minutes and can only be used once.',
      'If you did not request a password reset, you can safely ignore this email.'
    ].join('\n')
  });
}

export async function sendNewLeadNotification({ profile, lead, conversationToken }: AcceptedLead) {
  if (!profile?.email || !process.env.RESEND_API_KEY || !process.env.SITTERFOLIO_FROM_EMAIL) return;

  const businessName = bounded(profile.businessName || profile.sitterName || profile.subdomain, 80);
  const customerName = bounded(lead.name, 120);
  const details = bounded(lead.message, 500);
  const adminUrl = `${getAppOrigin()}/admin`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.SITTERFOLIO_FROM_EMAIL,
    to: profile.email,
    replyTo: lead.email,
    subject: `New inquiry from ${customerName} — ${businessName}`,
    html: renderSitterfolioEmail({
      preview: `${customerName} sent a new inquiry to ${businessName}.`,
      title: `New inquiry from ${customerName}`,
      intro: `A pet owner sent a request to ${businessName}.`,
      details: [
        { label: 'Email', value: bounded(lead.email, 160) },
        { label: 'Service', value: bounded(lead.serviceRequested, 120) || 'Not specified' },
        { label: 'Dates', value: bounded([lead.requestedStartDate, lead.requestedEndDate].filter(Boolean).join(' to ') || lead.dates, 120) || 'Not specified' },
        { label: 'Pets', value: bounded([lead.petCount ? `${lead.petCount} ` : '', lead.petTypes?.join(', ')].join(''), 120) || 'Not specified' },
        { label: 'Postal code', value: bounded(lead.postalCode, 20) || 'Not specified' }
      ],
      message: { label: 'Care details', body: details || 'Not provided' },
      action: { label: 'Review inquiry', url: adminUrl },
      footer: 'Sent by Sitterfolio'
    }),
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
      `Review the full inquiry in Sitterfolio: ${adminUrl}`
    ].join('\n')
  });
  if (error) throw new Error('resend rejected notification');

  if (conversationToken) {
    const conversationUrl = `${getAppOrigin()}/conversation/${conversationToken}`;
    const { error: customerError } = await resend.emails.send({
      from: process.env.SITTERFOLIO_FROM_EMAIL,
      to: lead.email,
      replyTo: profile.email,
      subject: `Your request to ${businessName}`,
      html: renderSitterfolioEmail({
        preview: `Your pet-care request was sent to ${businessName}.`,
        title: 'Your request was sent',
        intro: `${businessName} can reply in your private conversation. No account is needed.`,
        action: { label: 'View conversation', url: conversationUrl },
        notice: 'Keep this private link. Anyone with it can view and reply to this conversation.',
        footer: 'Sent by Sitterfolio'
      }),
      text: [
        `Your pet-care request was sent to ${businessName}.`,
        '',
        `${businessName} can reply in your private conversation. No account is needed.`,
        '',
        `View your conversation: ${conversationUrl}`,
        '',
        'Keep this private link. Anyone with it can view and reply to this conversation.'
      ].join('\n')
    }, { idempotencyKey: `conversation-started/${lead.id}` });
    if (customerError) throw new Error('resend rejected customer conversation email');
  }
}

export type PaymentRequestEmail = { from: string; to: string; replyTo?: string; subject: string; text: string; html: string; idempotencyKey: string };
export type EmailSender = (email: PaymentRequestEmail) => Promise<void>;

export const sendWithResend: EmailSender = async (email) => {
  if (!process.env.RESEND_API_KEY || !process.env.SITTERFOLIO_FROM_EMAIL) throw new Error('Email delivery is not configured');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { idempotencyKey, ...payload } = email;
  const { error } = await resend.emails.send(payload, { idempotencyKey });
  if (error) throw new Error('resend rejected notification');
};

export async function sendConversationMessageNotification(input: {
  messageId: string;
  conversationToken: string;
  recipientEmail: string;
  replyTo?: string | null;
  senderName: string;
  preview: string;
}, sender: EmailSender = sendWithResend) {
  const conversationUrl = `${getAppOrigin()}/conversation/${input.conversationToken}`;
  const senderName = bounded(input.senderName, 80);
  const preview = bounded(input.preview, 240);
  await sender({
    from: process.env.SITTERFOLIO_FROM_EMAIL || '',
    to: input.recipientEmail,
    replyTo: input.replyTo || undefined,
    subject: `New message from ${senderName}`,
    idempotencyKey: `conversation-message/${input.messageId}`,
    html: renderSitterfolioEmail({
      preview: `${senderName} sent you a message.`,
      title: `New message from ${senderName}`,
      intro: 'Continue the conversation when you are ready.',
      message: { body: preview },
      action: { label: 'View and reply', url: conversationUrl },
      notice: 'Keep this private link. Anyone with it can view and reply to this conversation.',
      footer: 'Sent by Sitterfolio'
    }),
    text: [
      `${senderName} sent you a message:`,
      '',
      preview,
      '',
      `View and reply: ${conversationUrl}`,
      '',
      'Keep this private link. Anyone with it can view and reply to this conversation.'
    ].join('\n')
  });
}

export async function sendPaymentRequestNotification(input: { paymentRequestId: string; publicToken: string; businessName: string; sitterEmail?: string | null; customerEmail: string; description: string; amountCents: number; customerNote?: string | null }, sender: EmailSender = sendWithResend) {
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(input.amountCents / 100);
  const paymentUrl = `${getAppOrigin()}/pay/${input.publicToken}`;
  await sender({
    from: process.env.SITTERFOLIO_FROM_EMAIL || '',
    to: input.customerEmail,
    replyTo: input.sitterEmail || undefined,
    subject: `Payment request from ${input.businessName} — ${amount}`,
    idempotencyKey: `payment-request/${input.paymentRequestId}`,
    html: renderSitterfolioEmail({
      preview: `${input.businessName} sent a payment request for ${amount}.`,
      title: `Payment request for ${amount}`,
      intro: `${input.businessName} sent you a secure payment request.`,
      details: [{ label: 'Service', value: input.description }, { label: 'Total', value: amount }],
      message: input.customerNote ? { label: 'Note from your sitter', body: input.customerNote } : undefined,
      action: { label: `Pay ${amount}`, url: paymentUrl },
      notice: 'Payment is processed securely through Stripe. Reply to this email to contact your sitter.',
      footer: 'Sent by Sitterfolio'
    }),
    text: [
      `${input.businessName} sent you a payment request.`, '',
      `Service: ${input.description}`, `Total: ${amount}`,
      ...(input.customerNote ? [`Note from your sitter: ${input.customerNote}`] : []), '',
      `Pay securely through Stripe: ${paymentUrl}`, '',
      'Your payment is processed securely through Stripe. Reply to this email to contact your sitter.'
    ].join('\n')
  });
}
