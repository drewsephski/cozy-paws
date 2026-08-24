import { describe, expect, it } from 'vitest';
import { normalizeLinkedInProfileUrl } from './linkedin-profile';

describe('LinkedIn profile URLs', () => {
  it('canonicalizes a personal profile and removes tracking data', () => {
    expect(
      normalizeLinkedInProfileUrl(
        '  https://linkedin.com/in/drew-sepeczi/?trk=public_profile#about  '
      )
    ).toBe('https://www.linkedin.com/in/drew-sepeczi');
    expect(normalizeLinkedInProfileUrl('https://uk.linkedin.com/in/drew-sepeczi/')).toBe(
      'https://www.linkedin.com/in/drew-sepeczi'
    );
  });

  it('clears an optional profile when the submitted value is empty', () => {
    expect(normalizeLinkedInProfileUrl('   ')).toBeNull();
    expect(normalizeLinkedInProfileUrl(null)).toBeNull();
  });

  it.each([
    'http://www.linkedin.com/in/drew-sepeczi',
    'https://example.com/in/drew-sepeczi',
    'https://notlinkedin.com/in/drew-sepeczi',
    'https://www.linkedin.com/company/sitterfolio',
    'https://www.linkedin.com/feed/',
    'https://www.linkedin.com/in/drew-sepeczi/details/contact-info/',
    'https://www.linkedin.com/in/drew-sepeczi%2Fcompany',
    'not a url'
  ])('rejects a non-profile LinkedIn URL: %s', (value) => {
    expect(() => normalizeLinkedInProfileUrl(value)).toThrow(
      'Enter an HTTPS LinkedIn personal profile URL like https://www.linkedin.com/in/your-name.'
    );
  });
});
