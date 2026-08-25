import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/conversation-thread', () => ({
  ConversationMessages: () => <div>Initial request</div>,
  ConversationReplyForm: () => <form>Reply</form>
}));
vi.mock('@/app/actions', () => ({
  createLeadAction: vi.fn()
}));
vi.mock('@/components/date-range-picker', () => ({
  DateRangePicker: () => <div><input type="hidden" name="startDate" /><input type="hidden" name="endDate" />Choose care dates</div>
}));
vi.mock('@/components/ui/noise-texture', () => ({
  NoiseTexture: () => null
}));
vi.mock('@/components/ui/spokes', () => ({ Spokes: () => null }));

import { LeadForm } from './lead-form';
import { LeadSubmissionConfirmation } from './lead-submission-confirmation';
import { InquiryFollowup } from './public-inquiry-column';

describe('LeadSubmissionConfirmation', () => {
  it('turns a submitted request into a named conversation', () => {
    const html = renderToStaticMarkup(<LeadSubmissionConfirmation sitterName="Drew" state={{ success: true, conversationToken: 'private-token', initialMessage: 'Two dogs' }} />);

    expect(html).toContain('role="status"');
    expect(html).toContain('Your conversation with Drew has started.');
    expect(html).toContain('No account needed.');
    expect(html).toContain('Check your Spam or Junk folder');
    expect(html).toContain('Mark it as not spam so links in the message work.');
    expect(html).toContain('/conversation/private-token');
  });
});

describe('LeadForm', () => {
  it('shows the availability form without a direct-message mode', () => {
    const html = renderToStaticMarkup(<LeadForm subdomain="drew" sitterName="Drew" services={['Dog walking', 'Drop-ins']} submissionToken="submission-token-with-at-least-32-characters" />);

    expect(html).toContain('Ask about availability');
    expect(html).toContain('Service needed');
    expect(html).toContain('Choose care dates');
    expect(html).toContain('Start with the basics');
    expect(html).toContain('Add helpful pet details');
    expect(html).toContain('name="petTypes"');
    expect(html).toContain('name="postalCode"');
    expect(html).toContain('name="details"');
    expect(html).toContain('name="startDate"');
    expect(html).toContain('name="endDate"');
    expect(html).toContain('Request availability');
    expect(html).toContain('This starts a private conversation');
    expect(html).toContain('value="Dog walking"');
    expect(html).toContain('sitterfolio_site');
    expect(html).toContain('name="submissionToken"');
    expect(html).not.toContain('Direct message');
    expect(html).not.toContain('sitterfolio_direct_message');
  });
});

describe('InquiryFollowup', () => {
  it('offers a general question before an inquiry starts', () => {
    const html = renderToStaticMarkup(<InquiryFollowup subdomain="drew" sitterName="Drew" />);

    expect(html).toContain('Have a general question?');
    expect(html).toContain('Ask a question');
    expect(html).toContain(encodeURIComponent('/message/drew'));
    expect(html).not.toContain('Open messages');
  });

  it('replaces the general question with the private conversation link', () => {
    const html = renderToStaticMarkup(<InquiryFollowup subdomain="drew" sitterName="Drew" conversationToken="private-token" />);

    expect(html).toContain('Your messages with Drew');
    expect(html).toContain('Open messages');
    expect(html).toContain('/conversation/private-token');
    expect(html).not.toContain('Have a general question?');
    expect(html).not.toContain('Ask a question');
  });
});
