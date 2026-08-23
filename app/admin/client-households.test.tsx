import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions', () => ({
  addClientPetAction: vi.fn(),
  updateClientHouseholdAction: vi.fn(),
  updateClientPetAction: vi.fn()
}));

import { ClientHouseholds } from './client-households';

describe('ClientHouseholds', () => {
  it('offers bounded editing for saved household and pet profiles', () => {
    const html = renderToStaticMarkup(<ClientHouseholds households={[{
      id: 'household-1', businessId: 'business-1', sourceLeadId: 'lead-1', name: 'Sam Lee',
      email: 'sam@example.com', postalCode: '60302', careNotes: 'Side door', createdAt: 1, updatedAt: 1,
      pets: [{ id: 'pet-1', name: 'Dog 1', type: 'Dog', careNotes: 'Dinner medication' }]
    }]} />);

    expect(html).toContain('Edit client details');
    expect(html).toContain('value="Dog 1"');
    expect(html).toContain('name="petId" value="pet-1"');
    expect(html).toContain('Add a pet');
    expect(html).not.toContain('Delete');
  });
});
