import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/app/actions', () => ({ createAuthenticatedLeadAction: vi.fn() }));
vi.mock('@/components/ui/spokes', () => ({ Spokes: () => null }));

import { MessageStarter } from './message-starter';

describe('MessageStarter', () => {
  it('uses the signed-in pet owner identity to start an in-app conversation', () => {
    const html = renderToStaticMarkup(<MessageStarter subdomain="drew" sitterName="Drew" customer={{ name: 'Alex', email: 'alex@example.com' }} submissionToken="submission-token-with-at-least-32-characters" />);

    expect(html).toContain('Messaging as Alex');
    expect(html).toContain('alex@example.com');
    expect(html).not.toContain('name="name"');
    expect(html).not.toContain('name="email"');
    expect(html).not.toContain('sitterfolio_account_message');
    expect(html).toContain('name="submissionToken"');
    expect(html).toContain('Message Drew');
  });
});
