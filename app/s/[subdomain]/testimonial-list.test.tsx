import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TestimonialList } from './testimonial-list';

describe('public testimonials', () => {
  it('labels sitter-provided praise and explains the verification boundary', () => {
    const html = renderToStaticMarkup(<TestimonialList testimonials={[{
      id: 'testimonial-1',
      text: 'Jamie was patient and dependable with our senior dog.',
      source: 'Morgan, senior-dog client'
    }]} />);

    expect(html).toContain('Self-published testimonials');
    expect(html).toContain('Jamie was patient and dependable with our senior dog.');
    expect(html).toContain('Morgan, senior-dog client');
    expect(html).toContain('Sitterfolio did not verify the care, client, transaction, or claims in these testimonials.');
    expect(html).not.toContain('Verified care');
  });

  it('renders nothing when a Site has no published testimonials', () => {
    expect(renderToStaticMarkup(<TestimonialList testimonials={[]} />)).toBe('');
  });
});
