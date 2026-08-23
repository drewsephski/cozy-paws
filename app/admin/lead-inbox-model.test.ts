import { describe, expect, it } from 'vitest';
import { buildSiteFilterOptions, formatInquiryDate, formatInquiryDateRange, groupLeadsByEmail } from './lead-inbox-model';

describe('lead inbox model', () => {
  it('includes owned sites even when all of their inquiries are read', () => {
    const sites = [{ subdomain: 'happy-tails', businessName: 'Happy Tails' }];
    const leads = [{
      id: 'lead-1',
      subdomain: 'happy-tails',
      siteName: 'Happy Tails',
      name: 'Pat',
      email: 'pat@example.com',
      dates: '',
      message: '',
      createdAt: 1,
      readAt: 2
    }];

    expect(buildSiteFilterOptions(sites, leads)).toEqual([
      { subdomain: 'happy-tails', name: 'Happy Tails', inquiryCount: 1 }
    ]);
  });

  it('includes an owned site before it receives an inquiry', () => {
    expect(buildSiteFilterOptions([{ subdomain: 'new-site', sitterName: 'Drew' }], [])).toEqual([
      { subdomain: 'new-site', name: 'Drew', inquiryCount: 0 }
    ]);
  });

  it('formats stored calendar dates without exposing timestamps', () => {
    expect(formatInquiryDate('2026-08-13')).toBe('Aug 13, 2026');
  });

  it('prefers structured dates and formats a same-year range for the inquiry summary', () => {
    expect(formatInquiryDateRange({
      requestedStartDate: '2026-07-28T00:00:00.000Z',
      requestedEndDate: '2026-08-13T00:00:00.000Z',
      dates: ''
    })).toBe('Jul 28 – Aug 13, 2026');
  });

  it('uses legacy date details only when structured dates are absent', () => {
    expect(formatInquiryDateRange({ dates: 'Weekends in September' })).toBe('Weekends in September');
    expect(formatInquiryDateRange({ dates: '' })).toBe('Dates not provided');
  });

  it('groups inquiries from the same normalized email into one newest-first conversation', () => {
    const lead = (id: string, email: string, createdAt: number) => ({
      id, email, createdAt, subdomain: 'happy-tails', siteName: 'Happy Tails', name: id,
      dates: '', message: '', readAt: null
    });

    expect(groupLeadsByEmail([
      lead('older', ' Owner@Example.com ', 10),
      lead('other', 'other@example.com', 20),
      lead('newer', 'owner@example.com', 30)
    ]).map((conversation) => conversation.leads.map(({ id }) => id))).toEqual([
      ['newer', 'older'],
      ['other']
    ]);
  });
});
