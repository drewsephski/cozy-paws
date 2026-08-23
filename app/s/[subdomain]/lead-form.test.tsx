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

import { LeadForm } from './lead-form';
import { LeadSubmissionConfirmation } from './lead-submission-confirmation';

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
    const html = renderToStaticMarkup(<LeadForm subdomain="drew" sitterName="Drew" />);

    expect(html).toContain('Tell me about your pet');
    expect(html).toContain('Service needed');
    expect(html).toContain('Choose care dates');
    expect(html).toContain('name="startDate"');
    expect(html).toContain('name="endDate"');
    expect(html).toContain('Send availability request');
    expect(html).toContain('sitterfolio_site');
    expect(html).not.toContain('Direct message');
    expect(html).not.toContain('sitterfolio_direct_message');
  });
});
