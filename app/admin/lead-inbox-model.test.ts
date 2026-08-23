import { describe, expect, it } from 'vitest';
import { buildSiteFilterOptions, formatInquiryDate } from './lead-inbox-model';

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
});
