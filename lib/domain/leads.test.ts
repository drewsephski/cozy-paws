import { describe, expect, it } from 'vitest';
import { canSaveClientFromLead, canTransitionLead, parseLeadSubmission } from './leads';

describe('lead intake', () => {
  it('accepts qualified inquiry fields and preserves attribution', () => {
    const result = parseLeadSubmission({
      name: '  Ada  ', email: 'ADA@example.com', service: 'Overnight care', startDate: '2026-09-12',
      endDate: '2026-09-15', petTypes: 'Dog, cat', petCount: '2', postalCode: '60302',
      details: 'Two friendly pets.', source: 'instagram', campaign: 'fall-launch'
    });
    expect(result).toEqual({ success: true, data: {
      name: 'Ada', email: 'ada@example.com', serviceRequested: 'Overnight care', requestedStartDate: '2026-09-12',
      requestedEndDate: '2026-09-15', dateDetails: '', petTypes: ['Dog', 'cat'], petCount: 2,
      postalCode: '60302', careDetails: 'Two friendly pets.', source: 'instagram', campaign: 'fall-launch'
    }});
  });

  it('rejects invalid inquiries and reversed dates', () => {
    expect(parseLeadSubmission({ name: '', email: 'bad' }).success).toBe(false);
    expect(parseLeadSubmission({ name: 'Ada', email: 'a@example.com', startDate: '2026-09-15', endDate: '2026-09-12' }).success).toBe(false);
  });
});

describe('lead lifecycle', () => {
  it('allows reusable clients from active care relationships only', () => {
    expect(canSaveClientFromLead('QUALIFIED')).toBe(true);
    expect(canSaveClientFromLead('QUOTED')).toBe(true);
    expect(canSaveClientFromLead('BOOKED')).toBe(true);
    expect(canSaveClientFromLead('NEW')).toBe(false);
    expect(canSaveClientFromLead('DECLINED')).toBe(false);
  });

  it('allows the deliberate commercial transitions only', () => {
    expect(canTransitionLead('NEW', 'QUALIFIED')).toBe(true);
    expect(canTransitionLead('QUALIFIED', 'QUOTED')).toBe(true);
    expect(canTransitionLead('QUOTED', 'BOOKED')).toBe(true);
    expect(canTransitionLead('BOOKED', 'NEW')).toBe(false);
    expect(canTransitionLead('SPAM', 'QUALIFIED')).toBe(false);
  });
});
