import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clientQueryMock, queryMock, transactionMock } = vi.hoisted(() => ({
  clientQueryMock: vi.fn(),
  queryMock: vi.fn(),
  transactionMock: vi.fn()
}));

vi.mock('./db', () => ({ query: queryMock, transaction: transactionMock }));

import { createClientHouseholdFromOwnedLead, listOwnerClientHouseholds } from './client-households';

describe('client households', () => {
  beforeEach(() => {
    clientQueryMock.mockReset();
    queryMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (work) => work({ query: clientQueryMock }));
  });

  it('converts an owned qualified inquiry into one reusable household and pet profiles', async () => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [{
        lead_id: 'lead-1', business_id: 'business-1', customer_name: 'Sam Lee',
        customer_email: 'sam@example.com', postal_code: '60302', pet_types: ['Dog'],
        pet_count: 2, care_details: 'Medication at dinner.', status: 'QUALIFIED'
      }] })
      .mockResolvedValueOnce({ rows: [{
        id: 'household-1', business_id: 'business-1', source_lead_id: 'lead-1',
        name: 'Sam Lee', email: 'sam@example.com', postal_code: '60302',
        care_notes: 'Medication at dinner.', created_at: new Date('2026-08-23T12:00:00Z'),
        updated_at: new Date('2026-08-23T12:00:00Z')
      }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [
        { id: 'pet-1', household_id: 'household-1', name: 'Dog 1', type: 'Dog', care_notes: 'Medication at dinner.', created_at: new Date('2026-08-23T12:00:00Z'), updated_at: new Date('2026-08-23T12:00:00Z') },
        { id: 'pet-2', household_id: 'household-1', name: 'Dog 2', type: 'Dog', care_notes: 'Medication at dinner.', created_at: new Date('2026-08-23T12:00:00Z'), updated_at: new Date('2026-08-23T12:00:00Z') }
      ] });

    const household = await createClientHouseholdFromOwnedLead('owner-1', 'lead-1');

    expect(household.name).toBe('Sam Lee');
    expect(household.pets.map((pet) => pet.name)).toEqual(['Dog 1', 'Dog 2']);
    expect(clientQueryMock.mock.calls[0][0]).toContain('b.owner_user_id=$2');
    expect(clientQueryMock.mock.calls[0][1]).toEqual(['lead-1', 'owner-1']);
    expect(clientQueryMock.mock.calls[1][0]).toContain('on conflict (source_lead_id) do nothing');
  });

  it('rejects inquiries that are not qualified and does not create records', async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [{
      lead_id: 'lead-1', business_id: 'business-1', customer_name: 'Sam Lee',
      customer_email: 'sam@example.com', postal_code: '', pet_types: [], pet_count: null,
      care_details: '', status: 'NEW'
    }] });

    await expect(createClientHouseholdFromOwnedLead('owner-1', 'lead-1')).rejects.toThrow(
      'Qualify the inquiry before saving this client.'
    );
    expect(clientQueryMock).toHaveBeenCalledTimes(1);
  });

  it('keeps distinct pet types readable when creating draft pet profiles', async () => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [{ lead_id: 'lead-2', business_id: 'business-1', customer_name: 'Pat', customer_email: 'pat@example.com', postal_code: '', pet_types: ['Dog', 'Cat'], pet_count: 2, care_details: '', status: 'BOOKED' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'household-2', business_id: 'business-1', source_lead_id: 'lead-2', name: 'Pat', email: 'pat@example.com', postal_code: '', care_notes: '', created_at: new Date(), updated_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await createClientHouseholdFromOwnedLead('owner-1', 'lead-2');

    expect(clientQueryMock.mock.calls[3][1]).toEqual(['household-2', ['Dog', 'Cat'], ['Dog', 'Cat'], '']);
  });

  it('returns an existing household unchanged when promotion is retried', async () => {
    const lead = { lead_id: 'lead-1', business_id: 'business-1', customer_name: 'Original name', customer_email: 'original@example.com', postal_code: '', pet_types: ['Dog'], pet_count: 1, care_details: 'Original notes', status: 'QUALIFIED' };
    const existing = { id: 'household-1', business_id: 'business-1', source_lead_id: 'lead-1', name: 'Edited client name', email: 'edited@example.com', postal_code: '60601', care_notes: 'Sitter-maintained notes', created_at: new Date('2026-08-23T12:00:00Z'), updated_at: new Date('2026-08-24T12:00:00Z') };
    const pet = { id: 'pet-1', household_id: 'household-1', name: 'Milo', type: 'Dog', care_notes: 'Updated pet notes', created_at: new Date(), updated_at: new Date() };
    clientQueryMock
      .mockResolvedValueOnce({ rows: [lead] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [existing] })
      .mockResolvedValueOnce({ rows: [pet] });

    const household = await createClientHouseholdFromOwnedLead('owner-1', 'lead-1');

    expect(household).toMatchObject({ name: 'Edited client name', email: 'edited@example.com', careNotes: 'Sitter-maintained notes' });
    expect(clientQueryMock.mock.calls[1][0]).not.toContain('do update');
    expect(clientQueryMock.mock.calls[2][0]).toContain('source_lead_id=$1 and business_id=$2');
  });

  it('does not reveal inquiries owned by another sitter', async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [] });

    await expect(createClientHouseholdFromOwnedLead('owner-2', 'lead-1')).rejects.toThrow(
      'Inquiry not found.'
    );
  });

  it('lists only the owner household and pet records as nested clients', async () => {
    queryMock.mockResolvedValueOnce({ rows: [
      { household_id: 'household-1', business_id: 'business-1', source_lead_id: 'lead-1', household_name: 'Sam Lee', email: 'sam@example.com', postal_code: '60302', household_care_notes: 'Dinner medication', household_created_at: new Date('2026-08-23T12:00:00Z'), household_updated_at: new Date('2026-08-23T12:00:00Z'), pet_id: 'pet-1', pet_name: 'Milo', pet_type: 'Dog', pet_care_notes: 'One tablet' },
      { household_id: 'household-1', business_id: 'business-1', source_lead_id: 'lead-1', household_name: 'Sam Lee', email: 'sam@example.com', postal_code: '60302', household_care_notes: 'Dinner medication', household_created_at: new Date('2026-08-23T12:00:00Z'), household_updated_at: new Date('2026-08-23T12:00:00Z'), pet_id: 'pet-2', pet_name: 'Luna', pet_type: 'Cat', pet_care_notes: 'Wet food' }
    ] });

    const households = await listOwnerClientHouseholds('owner-1');

    expect(households).toHaveLength(1);
    expect(households[0].pets.map((pet) => pet.name)).toEqual(['Milo', 'Luna']);
    expect(queryMock.mock.calls[0][0]).toContain('b.owner_user_id=$1');
    expect(queryMock.mock.calls[0][1]).toEqual(['owner-1']);
  });
});
