import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/conversation-thread', () => ({
  ConversationMessages: () => <div>Initial request</div>,
  ConversationReplyForm: () => <form>Reply</form>
}));

import { LeadSubmissionConfirmation } from './lead-submission-confirmation';

describe('LeadSubmissionConfirmation', () => {
  it('turns a submitted request into a named conversation', () => {
    const html = renderToStaticMarkup(<LeadSubmissionConfirmation sitterName="Drew" state={{ success: true, conversationToken: 'private-token', initialMessage: 'Two dogs' }} />);

    expect(html).toContain('role="status"');
    expect(html).toContain('Your conversation with Drew has started.');
    expect(html).toContain('No account needed.');
    expect(html).toContain('/conversation/private-token');
  });
});
