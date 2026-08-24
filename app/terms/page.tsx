import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing access to and use of Sitterfolio.',
  alternates: { canonical: '/terms' }
};

const sections: LegalSection[] = [
  {
    id: 'using-sitterfolio',
    title: 'Using Sitterfolio',
    content: <>
      <p>You must be at least 18 years old and able to enter a binding agreement to create a sitter account. You are responsible for accurate account information, safeguarding your sign-in methods, and activity performed through your account.</p>
      <p>We may change, suspend, or discontinue features as the service develops. We will try to provide reasonable notice when a change materially affects active users.</p>
    </>
  },
  {
    id: 'direct-relationships',
    title: 'Direct sitter and pet-owner relationships',
    content: <>
      <p>Sitterfolio provides business-profile, inquiry, communication, client-record, booking-planning, and payment-request tools. Sitterfolio is not a pet-care marketplace, employer, staffing agency, insurer, or party to the agreement between a sitter and pet owner.</p>
      <p>Sitters independently decide which services to offer, whether to accept a request, what to charge, and how to perform care. Pet owners and sitters are responsible for evaluating each other, confirming care details, handling keys and property access, addressing emergencies, and complying with applicable laws, licenses, taxes, and insurance requirements.</p>
    </>
  },
  {
    id: 'content',
    title: 'Your content and public site',
    content: <>
      <p>You keep ownership of content you submit. You grant Sitterfolio a worldwide, non-exclusive license to host, copy, display, format, and process that content only as needed to operate, secure, and improve the service.</p>
      <p>You are responsible for having permission to submit names, images, contact details, pet records, care notes, and other information. Public profile content must be accurate and may not be deceptive, infringing, unlawful, abusive, or unsafe. Sitterfolio may remove content or restrict a site when reasonably necessary to enforce these terms or protect users.</p>
    </>
  },
  {
    id: 'payments',
    title: 'Payments',
    content: <>
      <p>Eligible sitters may connect their own Stripe account and send payment requests or accept public payments through Stripe-hosted Checkout. Stripe processes payment credentials and may impose separate terms, verification requirements, holds, fees, restrictions, or account actions.</p>
      <p>A payment does not by itself create, confirm, modify, or complete a pet-care booking. Sitters are responsible for amounts, refunds, disputes, taxes, and fulfillment of their agreements with pet owners unless Sitterfolio expressly states otherwise.</p>
    </>
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    content: <>
      <p>You may not misuse Sitterfolio, interfere with its operation, access another user’s information without permission, evade security or rate limits, upload malicious code, scrape the service at unreasonable volume, impersonate others, send spam, or use the service for unlawful, fraudulent, exploitative, or harmful activity.</p>
      <p>You may not use private inquiry links, payment links, or account credentials in a way that exposes another person’s information.</p>
    </>
  },
  {
    id: 'availability-disclaimers',
    title: 'Availability and disclaimers',
    content: <>
      <p>Sitterfolio is provided on an “as is” and “as available” basis to the extent permitted by law. We do not guarantee uninterrupted availability, a particular business outcome, the identity or qualifications of users, the quality or safety of pet care, payment completion, or the accuracy of user-submitted content.</p>
      <p>Nothing in Sitterfolio’s review or moderation of profile content is an identity, background, insurance, credential, or service-quality verification.</p>
    </>
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    content: <>
      <p>To the fullest extent permitted by law, Sitterfolio and its operators will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, data, goodwill, business opportunities, or pet-care arrangements arising from use of the service.</p>
      <p>Some jurisdictions do not allow certain exclusions or limitations, so portions of this section may not apply to you.</p>
    </>
  },
  {
    id: 'termination-changes-contact',
    title: 'Termination, changes, and contact',
    content: <>
      <p>You may stop using Sitterfolio at any time. We may suspend or terminate access when reasonably necessary to protect users, comply with law, prevent abuse, or enforce these terms. Sections that by their nature should survive termination will remain in effect.</p>
      <p>We may update these terms. Material changes will be identified by a new effective date and, when appropriate, an additional notice. Continued use after updated terms take effect means you accept them.</p>
      <p>Questions about these terms may be sent to the user-support email identified on Sitterfolio’s Google sign-in consent screen.</p>
    </>
  }
];

export default function TermsPage() {
  return <LegalPage title="Terms of service" summary="These terms set the ground rules for using Sitterfolio and clarify the direct relationship between independent sitters and pet owners." effectiveDate="August 24, 2026" sections={sections} />;
}
