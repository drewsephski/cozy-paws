import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProfileCareFields, ProfileServiceFields } from './profile-rich-fields';

const site = {
  emoji: 'dog',
  createdAt: 1,
  services: ['Dog walking'],
  about: 'Calm, routine-focused care.',
  serviceDetails: {
    'Dog walking': { description: 'A neighborhood walk.', startingPrice: '$25', billingUnit: 'per walk' }
  }
};

describe('profile editor field groups', () => {
  it('keeps narrative care fields separate from service pricing', () => {
    const html = renderToStaticMarkup(<ProfileCareFields site={site} />);
    expect(html).toContain('Care routine');
    expect(html).toContain('Calm, routine-focused care.');
    expect(html).not.toContain('Starting price');
  });

  it('renders saved services with their description and pricing fields', () => {
    const html = renderToStaticMarkup(<ProfileServiceFields site={site} />);
    expect(html).toContain('Dog walking');
    expect(html).toContain('A neighborhood walk.');
    expect(html).toContain('Starting price');
    expect(html).not.toContain('Care routine');
  });

  it('explains the save-first flow when no services exist yet', () => {
    const html = renderToStaticMarkup(<ProfileServiceFields site={{ emoji: 'dog', createdAt: 1 }} />);
    expect(html).toContain('Choose and save your services first');
  });
});
