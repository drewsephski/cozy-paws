import { describe, expect, it } from 'vitest';
import { canonicalizeRoverProfileUrl } from './rover-profile-url';

describe('canonicalizeRoverProfileUrl', () => {
  it('accepts only the exact public Rover member URL and strips navigation state', () => {
    expect(canonicalizeRoverProfileUrl('https://www.rover.com/members/indre-p-fox-river-grove-dog-sitter/?service_type=boarding#reviews')).toBe(
      'https://www.rover.com/members/indre-p-fox-river-grove-dog-sitter/'
    );
  });

  it.each([
    'http://www.rover.com/members/jamie/',
    'https://rover.com/members/jamie/',
    'https://www.rover.com:444/members/jamie/',
    'https://user@www.rover.com/members/jamie/',
    'https://www.rover.com/members/jamie/extra',
    'https://www.rover.com//members/jamie/',
    'https://www.rover.com/members/jamie%2fother/',
    'https://www.rover.com/members/../jamie/',
    'https://www.rover.com/members/-jamie/',
    'https://www.rover.com/members/Jamie/',
    'https://www.r0ver.com/members/jamie/'
  ])('rejects ambiguous or unsafe input: %s', (value) => {
    expect(() => canonicalizeRoverProfileUrl(value)).toThrow('Enter a valid Rover public profile URL.');
  });
});
