import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GrowthReportView } from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  redirect: vi.fn(),
  notFound: vi.fn()
}));

describe('growth report view', () => {
  it('renders durable counts and labels unavailable stages honestly', () => {
    const html = renderToStaticMarkup(<GrowthReportView report={{
      acquisition: { selectedContacts: null, substantiveConversations: null, trials: null, publishedSites: 7, sharedBusinesses: 6, qualifiedBusinesses: 5, payingBusinesses: null, referrals: null, activeBusinesses30d: 4 },
      ownerJourney: { inquiries: 12, sitterReplies: 8, qualifiedLeads: 5, settledLeadPayments: 3, completedBookings: 2, reviews: null }
    }} />);

    expect(html).toContain('Founding growth report');
    expect(html).toContain('Published Sites');
    expect(html).toContain('>7<');
    expect(html).toContain('Unavailable');
  });
});
