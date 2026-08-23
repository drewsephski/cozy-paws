import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clientQueryMock, queryMock, transactionMock } = vi.hoisted(() => ({
  clientQueryMock: vi.fn(),
  queryMock: vi.fn(),
  transactionMock: vi.fn()
}));

vi.mock('./db', () => ({ query: queryMock, transaction: transactionMock }));

import { createOwnedBooking, listOwnerBookings, transitionOwnedBooking } from './bookings';

describe('bookings', () => {
  beforeEach(() => {
    clientQueryMock.mockReset();
    queryMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (work) => work({ query: clientQueryMock }));
  });

  it('creates a dated, priced booking for pets in an owned client household', async () => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [{
        household_id: 'household-1', business_id: 'business-1', source_lead_id: 'lead-1',
        household_name: 'Sam Lee', pet_id: 'pet-1', pet_name: 'Milo', pet_type: 'Dog'
      }, {
        household_id: 'household-1', business_id: 'business-1', source_lead_id: 'lead-1',
        household_name: 'Sam Lee', pet_id: 'pet-2', pet_name: 'Luna', pet_type: 'Cat'
      }] })
      .mockResolvedValueOnce({ rows: [{
        id: 'booking-1', business_id: 'business-1', household_id: 'household-1',
        source_lead_id: 'lead-1', start_date: '2026-09-10', end_date: '2026-09-12',
        amount_cents: 32500, status: 'DRAFT', notes: 'Evening arrival',
        created_at: new Date('2026-08-23T12:00:00Z'), updated_at: new Date('2026-08-23T12:00:00Z')
      }] })
      .mockResolvedValueOnce({ rows: [] });

    const booking = await createOwnedBooking('owner-1', {
      householdId: 'household-1', petIds: ['pet-1', 'pet-2'],
      startDate: '2026-09-10', endDate: '2026-09-12', amountCents: 32500,
      notes: ' Evening arrival '
    });

    expect(booking).toMatchObject({
      id: 'booking-1', businessId: 'business-1', householdId: 'household-1',
      sourceLeadId: 'lead-1', householdName: 'Sam Lee', amountCents: 32500,
      status: 'DRAFT', notes: 'Evening arrival'
    });
    expect(booking.pets.map((pet) => pet.name)).toEqual(['Milo', 'Luna']);
    expect(clientQueryMock.mock.calls[0][0]).toContain('b.owner_user_id=$2');
    expect(clientQueryMock.mock.calls[1][1]).toEqual([
      'business-1', 'household-1', 'lead-1', '2026-09-10', '2026-09-12', 32500, 'Evening arrival'
    ]);
  });

  it.each([
    [{ householdId: 'household-1', petIds: [], startDate: '2026-09-10', endDate: '2026-09-12', amountCents: 32500 }, 'Choose at least one pet.'],
    [{ householdId: 'household-1', petIds: ['pet-1'], startDate: '09/10/2026', endDate: '2026-09-12', amountCents: 32500 }, 'Enter valid booking dates.'],
    [{ householdId: 'household-1', petIds: ['pet-1'], startDate: '2026-09-13', endDate: '2026-09-12', amountCents: 32500 }, 'The end date cannot be before the start date.'],
    [{ householdId: 'household-1', petIds: ['pet-1'], startDate: '2026-09-10', endDate: '2026-09-12', amountCents: 32.5 }, 'Enter a whole-cent amount between $1 and $10,000.'],
    [{ householdId: 'household-1', petIds: ['pet-1'], startDate: '2026-09-10', endDate: '2026-09-12', amountCents: 1000001 }, 'Enter a whole-cent amount between $1 and $10,000.']
  ])('rejects invalid booking input before accessing the database', async (input, message) => {
    await expect(createOwnedBooking('owner-1', input)).rejects.toThrow(message);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects pets outside the owned household without creating a booking', async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [{
      household_id: 'household-1', business_id: 'business-1', source_lead_id: 'lead-1',
      household_name: 'Sam Lee', pet_id: 'pet-1', pet_name: 'Milo', pet_type: 'Dog'
    }] });

    await expect(createOwnedBooking('owner-1', {
      householdId: 'household-1', petIds: ['pet-1', 'pet-other-household'],
      startDate: '2026-09-10', endDate: '2026-09-12', amountCents: 32500
    })).rejects.toThrow('Choose pets from this client household.');
    expect(clientQueryMock).toHaveBeenCalledTimes(1);
  });

  it('lists only owner bookings with nested household pets in an inclusive range', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{
      booking_id: 'booking-1', business_id: 'business-1', household_id: 'household-1', source_lead_id: 'lead-1',
      start_date: '2026-09-10', end_date: '2026-09-12', amount_cents: 32500, status: 'CONFIRMED', notes: '',
      booking_created_at: new Date('2026-08-23T12:00:00Z'), booking_updated_at: new Date('2026-08-24T12:00:00Z'),
      household_name: 'Sam Lee', pet_id: 'pet-1', pet_name: 'Milo', pet_type: 'Dog'
    }, {
      booking_id: 'booking-1', business_id: 'business-1', household_id: 'household-1', source_lead_id: 'lead-1',
      start_date: '2026-09-10', end_date: '2026-09-12', amount_cents: 32500, status: 'CONFIRMED', notes: '',
      booking_created_at: new Date('2026-08-23T12:00:00Z'), booking_updated_at: new Date('2026-08-24T12:00:00Z'),
      household_name: 'Sam Lee', pet_id: 'pet-2', pet_name: 'Luna', pet_type: 'Cat'
    }] });

    const bookings = await listOwnerBookings('owner-1', { startDate: '2026-09-01', endDate: '2026-09-30' });

    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({ householdName: 'Sam Lee', startDate: '2026-09-10', status: 'CONFIRMED' });
    expect(bookings[0].pets.map((pet) => pet.name)).toEqual(['Milo', 'Luna']);
    expect(queryMock.mock.calls[0][0]).toContain('b.owner_user_id=$1');
    expect(queryMock.mock.calls[0][1]).toEqual(['owner-1', '2026-09-01', '2026-09-30']);
  });

  it.each([
    ['DRAFT', 'CONFIRMED'],
    ['DRAFT', 'CANCELLED'],
    ['CONFIRMED', 'COMPLETED'],
    ['CONFIRMED', 'CANCELLED']
  ])('moves an owned booking through an allowed %s to %s transition', async (current, next) => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [{ status: current }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(transitionOwnedBooking('owner-1', 'booking-1', next)).resolves.toBe(true);
    expect(clientQueryMock.mock.calls[0][0]).toContain('b.owner_user_id=$2');
    expect(clientQueryMock.mock.calls[1][1]).toEqual(['booking-1', next]);
  });

  it.each([
    ['DRAFT', 'COMPLETED'],
    ['COMPLETED', 'CANCELLED'],
    ['CANCELLED', 'CONFIRMED']
  ])('rejects the unsupported %s to %s lifecycle transition', async (current, next) => {
    clientQueryMock.mockResolvedValueOnce({ rows: [{ status: current }] });

    await expect(transitionOwnedBooking('owner-1', 'booking-1', next)).resolves.toBe(false);
    expect(clientQueryMock).toHaveBeenCalledTimes(1);
  });

  it('does not reveal or transition another sitter booking', async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [] });

    await expect(transitionOwnedBooking('owner-2', 'booking-1', 'CONFIRMED')).resolves.toBe(false);
    expect(clientQueryMock).toHaveBeenCalledTimes(1);
  });
});
