import { describe, expect, it } from 'vitest';
import { safeAuthCallbackURL } from './auth-callback';

describe('safeAuthCallbackURL', () => {
  it('keeps relative application paths', () => {
    expect(safeAuthCallbackURL('/admin')).toBe('/admin');
    expect(safeAuthCallbackURL('/message/happy-tails?from=auth')).toBe('/message/happy-tails?from=auth');
    expect(safeAuthCallbackURL('/admin?next=%2Fmessage%2Fhappy-tails#inbox')).toBe('/admin?next=%2Fmessage%2Fhappy-tails#inbox');
  });

  it.each([
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/%5cexample.com',
    '/%2f%2fexample.com',
    '/%E0%A4%A',
    '/admin\nhttps://example.com',
    '/admin\u0000',
  ])('rejects external or ambiguous redirect %j', (callbackURL) => {
    expect(safeAuthCallbackURL(callbackURL)).toBe('/admin');
  });

  it('uses the dashboard for missing callbacks', () => {
    expect(safeAuthCallbackURL('https://example.com')).toBe('/admin');
    expect(safeAuthCallbackURL()).toBe('/admin');
  });
});
