import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, exportOwnedBusinessTestimonials } = vi.hoisted(() => ({
  getSession: vi.fn(),
  exportOwnedBusinessTestimonials: vi.fn()
}));

vi.mock('@/lib/session', () => ({ getSession }));
vi.mock('@/lib/trust-referral-eligibility', () => ({ trustReferralEligibility: { exportOwnedBusinessTestimonials } }));

import { GET } from './route';

describe('testimonial export route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires authentication', async () => {
    getSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(exportOwnedBusinessTestimonials).not.toHaveBeenCalled();
  });

  it('downloads only the authenticated owner Business testimonial export', async () => {
    getSession.mockResolvedValue({ user: { id: 'owner-1' } });
    exportOwnedBusinessTestimonials.mockResolvedValue({ schemaVersion: 'sitterfolio.business-testimonials.v1', businesses: [] });
    const response = await GET();
    expect(exportOwnedBusinessTestimonials).toHaveBeenCalledWith('owner-1');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="sitterfolio-testimonials.json"');
    await expect(response.json()).resolves.toEqual({ schemaVersion: 'sitterfolio.business-testimonials.v1', businesses: [] });
  });
});
