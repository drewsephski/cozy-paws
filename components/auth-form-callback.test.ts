import { describe, expect, it } from 'vitest';
import { clientAuthCallbackURL } from './auth-form';

describe('client authentication callback navigation', () => {
  it('uses the same canonical same-origin validation before browser navigation', () => {
    expect(clientAuthCallbackURL(new URLSearchParams('callbackURL=%2Fmessage%2Fhappy-tails%3Ffrom%3Dauth'))).toBe('/message/happy-tails?from=auth');
    expect(clientAuthCallbackURL(new URLSearchParams('callbackURL=%2F%5C%5Cexample.com'))).toBe('/admin');
    expect(clientAuthCallbackURL(new URLSearchParams('callbackURL=%2F%252f%252fexample.com'))).toBe('/admin');
  });
});
