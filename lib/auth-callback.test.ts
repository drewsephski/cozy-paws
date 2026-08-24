import { describe, expect, it } from 'vitest';
import { safeAuthCallbackURL } from './auth-callback';

describe('safeAuthCallbackURL', () => {
  it('keeps relative application paths', () => {
    expect(safeAuthCallbackURL('/admin')).toBe('/admin');
    expect(safeAuthCallbackURL('/message/happy-tails?from=auth')).toBe('/message/happy-tails?from=auth');
  });

  it('rejects external and protocol-relative redirects', () => {
    expect(safeAuthCallbackURL('https://example.com')).toBe('/admin');
    expect(safeAuthCallbackURL('//example.com')).toBe('/admin');
    expect(safeAuthCallbackURL()).toBe('/admin');
  });
});
