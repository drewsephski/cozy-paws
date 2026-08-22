import { Resend } from 'resend';
import type { AcceptedLead } from './lead-intake';
import { getOrigin } from './stripe';

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
      `Review the full inquiry in Sitterfolio: ${getOrigin()}/admin`
    ].join('\n')
  });
  if (error) throw new Error('resend rejected notification');
}
