import { describe, expect, it } from 'vitest';
import { normalizePostgresCalendarDate } from './postgres-profile-repository';

describe('Postgres profile repository', () => {
  it('normalizes a Postgres date value before it crosses the client-component boundary', () => {
    expect(normalizePostgresCalendarDate(new Date(2026, 6, 29))).toBe('2026-07-29');
    expect(normalizePostgresCalendarDate(null)).toBeNull();
  });
});
