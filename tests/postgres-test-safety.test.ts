import { describe, expect, it } from 'vitest';
import { safeTestDatabaseURL } from './integration/support/test-database';

describe('PostgreSQL integration target guard', () => {
  it('accepts only an unmistakably test-only local database', () => {
    expect(safeTestDatabaseURL('postgresql://postgres:postgres@127.0.0.1:5432/sitterfolio_test').database).toBe('sitterfolio_test');
    expect(() => safeTestDatabaseURL()).toThrow(/required/);
    expect(() => safeTestDatabaseURL('postgresql://user:secret@example.neon.tech/preview_test')).toThrow(/refused/);
    expect(() => safeTestDatabaseURL('postgresql://localhost/sitterfolio')).toThrow(/refused/);
  });
});
