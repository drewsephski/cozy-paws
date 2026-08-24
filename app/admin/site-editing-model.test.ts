import { describe, expect, it } from 'vitest';
import { editableSiteOptions, reviewedBookingDraft } from './site-editing-model';

describe('multi-Site editing and reviewed Booking handoff', () => {
  it('offers every owned Site as an editing target', () => {
    expect(editableSiteOptions([
      { subdomain: 'first', ownerId: 'owner-1', emoji: 'dog', createdAt: 1, businessName: 'First Care' },
      { subdomain: 'second', ownerId: 'owner-1', emoji: 'cat', createdAt: 2, sitterName: 'Jamie' }
    ])).toEqual([{ value: 'first', label: 'First Care' }, { value: 'second', label: 'Jamie' }]);
  });

  it('preselects the saved household, pets, and requested dates without confirming anything', () => {
    const lead = { id: 'lead-1', subdomain: 'first', siteName: 'First', name: 'Sam', email: 'sam@example.com', dates: '', message: '', createdAt: 1, readAt: 1, requestedStartDate: '2026-09-10', requestedEndDate: '2026-09-12' };
    const household = { id: 'household-1', businessId: 'business-1', sourceLeadId: 'lead-1', name: 'Sam', email: 'sam@example.com', postalCode: '', careNotes: '', createdAt: 1, updatedAt: 1, pets: [{ id: 'pet-1', name: 'Milo', type: 'Dog', careNotes: '' }] };
    expect(reviewedBookingDraft(lead, household)).toEqual({ householdId: 'household-1', sourceLeadId: 'lead-1', petIds: ['pet-1'], startDate: '2026-09-10', endDate: '2026-09-12' });
    expect(reviewedBookingDraft({ ...lead, id: 'other' }, household)).toBeNull();
  });
});
