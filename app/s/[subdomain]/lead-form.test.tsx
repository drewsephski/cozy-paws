import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/conversation-thread', () => ({
  ConversationMessages: () => <div>Initial request</div>,
  ConversationReplyForm: () => <form>Reply</form>
}));
vi.mock('@/app/actions', () => ({
  createLeadAction: vi.fn()
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
  it('offers direct messaging first and keeps availability details optional', () => {
    const html = renderToStaticMarkup(<LeadForm subdomain="drew" sitterName="Drew" />);

    expect(html).toContain('Message Drew');
    expect(html).toContain('Direct message');
    expect(html).toContain('Availability details');
    expect(html).toContain('sitterfolio_direct_message');
    expect(html).not.toContain('Service needed');
  });
});
