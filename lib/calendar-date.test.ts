import { describe, expect, it } from 'vitest';
import { isCalendarDate } from './calendar-date';

describe('calendar date validation', () => {
  it.each(['2026-02-28', '2028-02-29'])('accepts %s', (value) => expect(isCalendarDate(value)).toBe(true));
  it.each(['2026-02-30', '2026-13-01', '02/28/2026', ''])('rejects %s', (value) => expect(isCalendarDate(value)).toBe(false));
});
