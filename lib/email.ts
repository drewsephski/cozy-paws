import { Resend } from 'resend';
import type { AcceptedLead } from './lead-intake';
import { getAppOrigin } from './app-url';

const bounded = (value: string | undefined, length: number) => (value || '').slice(0, length);

export type PasswordResetEmail = { to: string; subject: string; text: string; html: string };
export type PasswordResetEmailSender = (email: PasswordResetEmail) => Promise<void>;

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function passwordResetHtml(url: string) {
  const safeUrl = escapeHtml(url);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your Sitterfolio password</title>
  </head>
  <body style="margin:0;background:#f3f7f4;color:#18342d;font-family:Arial,'Helvetica Neue',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Choose a new Sitterfolio password. This secure link expires in 30 minutes.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f3f7f4;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #dce8e2;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(24,52,45,.08);">
            <tr>
              <td style="background:#174f40;padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:38px;height:38px;border-radius:11px;background:#f4cdbd;color:#174f40;font-size:20px;text-align:center;vertical-align:middle;">&#128062;</td>
                    <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-.3px;">Sitterfolio</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 32px;">
                <p style="margin:0 0 10px;color:#c76543;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Password reset</p>
                <h1 style="margin:0;color:#18342d;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.18;font-weight:700;letter-spacing:-.6px;">Choose a new password</h1>
                <p style="margin:18px 0 26px;color:#52655f;font-size:16px;line-height:1.65;">We received a request to reset your Sitterfolio password. Use the secure button below to choose a new one.</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:10px;background:#c76543;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Reset my password</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin-top:28px;background:#f3f7f4;border-radius:10px;">
                  <tr>
                    <td style="padding:16px 18px;color:#40564f;font-size:14px;line-height:1.55;"><strong style="color:#18342d;">For your security:</strong> this link expires in 30 minutes and can only be used once.</td>
                  </tr>
                </table>
                <p style="margin:26px 0 8px;color:#73827d;font-size:12px;line-height:1.55;">Button not working? Copy and paste this address into your browser:</p>
                <p style="margin:0;word-break:break-all;color:#52655f;font-size:12px;line-height:1.55;"><a href="${safeUrl}" style="color:#28725e;text-decoration:underline;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5ede9;padding:20px 32px;color:#73827d;font-size:12px;line-height:1.55;">If you didn’t request this, you can safely ignore this email. Your password will stay the same.</td>
            </tr>
          </table>
          <p style="margin:20px 0 0;color:#87948f;font-size:12px;">A secure account message from Sitterfolio</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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

export async function sendNewLeadNotification({ profile, lead }: AcceptedLead) {
  if (!profile?.email || !process.env.RESEND_API_KEY || !process.env.SITTERFOLIO_FROM_EMAIL) return;

  const businessName = bounded(profile.businessName || profile.sitterName || profile.subdomain, 80);
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
