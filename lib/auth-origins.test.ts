import { describe, expect, it } from 'vitest';
import { getTrustedOrigins } from './auth-origins';

describe('Better Auth trusted origins', () => {
  it('allows auth requests from public sitter subdomains', () => {
    expect(getTrustedOrigins({})).toContain('https://*.sitterfolio.com');
  });

  it('keeps explicit configured origins without surrounding whitespace', () => {
    expect(getTrustedOrigins({
      BETTER_AUTH_URL: ' https://preview.example.com ',
      BETTER_AUTH_TRUSTED_ORIGINS: ' https://one.example.com,https://two.example.com '
    })).toEqual(expect.arrayContaining([
      'https://preview.example.com',
      'https://one.example.com',
      'https://two.example.com'
    ]));
  });
});
