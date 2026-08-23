import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LeadSubmissionConfirmation } from './lead-submission-confirmation';

describe('LeadSubmissionConfirmation', () => {
  it('confirms which sitter received the request', () => {
    const html = renderToStaticMarkup(<LeadSubmissionConfirmation sitterName="Drew" />);

    expect(html).toContain('role="status"');
    expect(html).toContain('Your request is with Drew.');
    expect(html).toContain('Drew received your care details and will reply to you by email.');
    expect(html).toContain('What happens next');
  });
});
