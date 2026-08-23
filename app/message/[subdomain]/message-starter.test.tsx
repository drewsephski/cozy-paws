import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/app/actions', () => ({ createLeadAction: vi.fn() }));

import { MessageStarter } from './message-starter';

describe('MessageStarter', () => {
  it('uses the signed-in pet owner identity to start an in-app conversation', () => {
    const html = renderToStaticMarkup(<MessageStarter subdomain="drew" sitterName="Drew" customer={{ name: 'Alex', email: 'alex@example.com' }} />);

    expect(html).toContain('Messaging as Alex');
    expect(html).toContain('alex@example.com');
    expect(html).toContain('sitterfolio_account_message');
    expect(html).toContain('Message Drew');
  });
});
