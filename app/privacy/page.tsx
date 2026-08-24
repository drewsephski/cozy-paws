import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Sitterfolio collects, uses, and protects personal information.',
  alternates: { canonical: '/privacy' }
};

const sections: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    content: <>
      <p>We collect information you provide when you create an account, build a sitter site, communicate through Sitterfolio, save client or pet details, plan a booking, or request payment.</p>
      <ul>
        <li><strong>Account information:</strong> name, email address, profile image, authentication records, and session information.</li>
        <li><strong>Sitter business information:</strong> business name, biography, services, service areas, pricing, contact details, availability, and uploaded images.</li>
        <li><strong>Inquiry and care information:</strong> pet-owner contact details, requested dates, messages, pet details, care notes, saved household records, and booking information.</li>
        <li><strong>Payment information:</strong> payment-request status, amount, connected Stripe account status, and identifiers needed to reconcile a payment. Stripe collects and processes card or bank details; Sitterfolio does not store full payment-card numbers.</li>
        <li><strong>Technical information:</strong> device, browser, IP address, request logs, and product-usage information used for security, reliability, and analytics.</li>
      </ul>
    </>
  },
  {
    id: 'google-data',
    title: 'Google sign-in data',
    content: <>
      <p>If you choose Continue with Google, Google provides basic account information such as your name, email address, profile image, and a provider-specific account identifier. We use this information only to create or access your Sitterfolio account, link sign-in methods when appropriate, prevent abuse, and maintain your session.</p>
      <p>Sitterfolio does not request access to Gmail, Google Drive, Google Contacts, Google Calendar, or other Google account content. We do not sell Google user data or use it for advertising.</p>
    </>
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    content: <>
      <p>We use personal information to provide and secure Sitterfolio, publish sitter-selected profile information, route inquiries to the correct sitter, support conversations and client records, operate bookings and payment requests, send service messages, troubleshoot problems, and improve product reliability.</p>
      <p>A sitter chooses what business information appears publicly. Inquiry, conversation, client, pet, booking, and payment-request records remain in authenticated or private-link product surfaces and are not published as part of the sitter’s public site.</p>
    </>
  },
  {
    id: 'sharing',
    title: 'How we share information',
    content: <>
      <p>We share information only as needed to operate the service, complete a user-requested action, protect Sitterfolio and its users, or comply with law.</p>
      <ul>
        <li>With the sitter or pet owner participating in a direct inquiry, conversation, booking, or payment request.</li>
        <li>With service providers that host data, authenticate users, send email, store images, provide analytics, prevent abuse, or process payments, including Google and Stripe when you use those services.</li>
        <li>When required by law or reasonably necessary to protect rights, safety, and service integrity.</li>
        <li>As part of a merger, financing, acquisition, or sale, subject to appropriate confidentiality protections.</li>
      </ul>
      <p>We do not sell personal information.</p>
    </>
  },
  {
    id: 'retention-security',
    title: 'Retention and security',
    content: <>
      <p>We retain information for as long as needed to provide the service, maintain business and payment records, resolve disputes, enforce agreements, and meet legal obligations. Retention periods vary by record type and may continue after an account closes when required for these purposes.</p>
      <p>We use administrative, technical, and organizational safeguards designed to protect information. No internet service can guarantee absolute security.</p>
    </>
  },
  {
    id: 'choices',
    title: 'Your choices',
    content: <>
      <p>You can update much of your sitter profile and business information from the dashboard. You may also ask us to help access, correct, or delete personal information, subject to identity verification and records we must retain.</p>
      <p>You can remove Sitterfolio’s access from your Google Account permissions. Doing so prevents future Google sign-in unless you authorize it again, but it does not automatically delete your Sitterfolio account or records.</p>
    </>
  },
  {
    id: 'children-changes-contact',
    title: 'Children, changes, and contact',
    content: <>
      <p>Sitterfolio is a business service and is not directed to children under 13. We may update this policy as the product or law changes. Material changes will be identified by a new effective date and, when appropriate, an additional notice.</p>
      <p>Questions or privacy requests may be sent to the user-support email identified on Sitterfolio’s Google sign-in consent screen.</p>
    </>
  }
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" summary="This policy explains what information Sitterfolio handles, why we need it, and the choices available to sitters and pet owners." effectiveDate="August 24, 2026" sections={sections} />;
}
