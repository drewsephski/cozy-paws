import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Testimonials } from './testimonials';

vi.mock('@/app/actions', () => ({
  createTestimonialAction: vi.fn(),
  updateTestimonialAction: vi.fn(),
  setTestimonialPublishedAction: vi.fn(),
  removeTestimonialAction: vi.fn()
}));

describe('testimonial management', () => {
  it('requires source and permission and exposes edit, hide, and remove controls', () => {
    const html = renderToStaticMarkup(<Testimonials sites={[{ subdomain: 'happy-tails', name: 'Happy Tails' }]} testimonials={[{
      id: 'testimonial-1', siteSubdomain: 'happy-tails', type: 'SELF_PUBLISHED_TESTIMONIAL', text: 'Patient and reliable.', source: 'Morgan, dog client',
      permissionAttestedAt: new Date('2026-08-26T16:00:00Z'), publishedAt: new Date('2026-08-26T16:00:00Z'), hiddenAt: null,
      createdAt: new Date('2026-08-26T16:00:00Z'), updatedAt: new Date('2026-08-26T16:00:00Z')
    }]} />);

    expect(html).toContain('Self-published testimonials');
    expect(html).toContain('I confirm I have permission to publish this testimonial.');
    expect(html).toMatch(/id="testimonial-source"[^>]*required/);
    expect(html).toContain('Save changes');
    expect(html).toContain('Hide');
    expect(html).toContain('Remove');
    expect(html).toContain('Sitterfolio does not verify the care or claims.');
  });
});
