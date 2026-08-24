import { query, transaction } from './db';
import { canSaveClientFromLead, type LeadStatus } from './domain/leads';

type HouseholdRow = {
  id: string;
  business_id: string;
  source_lead_id: string;
  name: string;
  email: string;
  postal_code: string;
  care_notes: string;
  created_at: Date;
  updated_at: Date;
};

type PetRow = {
  id: string;
  household_id: string;
  name: string;
  type: string;
  care_notes: string;
  created_at: Date;
  updated_at: Date;
};

export type ClientPet = {
  id: string;
  name: string;
  type: string;
  careNotes: string;
};

export type ClientHousehold = {
  id: string;
  businessId: string;
  sourceLeadId: string;
  name: string;
  email: string;
  postalCode: string;
  careNotes: string;
  createdAt: number;
  updatedAt: number;
  pets: ClientPet[];
};

export type UpdateClientHouseholdInput = {
  name: string;
  email: string;
  postalCode: string;
  careNotes: string;
};

export type ClientPetInput = { name: string; type: string; careNotes: string };

function validatedPetInput(input: ClientPetInput) {
  return {
    name: requiredText(input.name, 'Pet name', 120),
    type: requiredText(input.type, 'Pet type', 80),
    careNotes: optionalText(input.careNotes, 'Pet care notes', 4000)
  };
}

function requiredText(value: unknown, label: string, maximumLength: number) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > maximumLength) throw new Error(`${label} is too long.`);
  return text;
}

function optionalText(value: unknown, label: string, maximumLength: number) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > maximumLength) throw new Error(`${label} is too long.`);
  return text;
}

function recordId(value: unknown, label: string) {
  const text = typeof value === 'string' ? value : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error(`${label} not found.`);
  }
  return text;
}

function petDrafts(types: string[], count: number | null) {
  const normalizedTypes = types.map((type) => type.trim()).filter(Boolean);
  const size = Math.max(count || 0, normalizedTypes.length, 1);
  const expandedTypes = Array.from({ length: size }, (_, index) => normalizedTypes[index] || normalizedTypes[0] || 'Pet');
  const totals = new Map<string, number>();
  for (const type of expandedTypes) totals.set(type, (totals.get(type) || 0) + 1);
  const seen = new Map<string, number>();
  return expandedTypes.map((type) => {
    const position = (seen.get(type) || 0) + 1;
    seen.set(type, position);
    return { type, name: (totals.get(type) || 0) > 1 ? `${type} ${position}` : type };
  });
}

function mapPet(row: PetRow): ClientPet {
  return { id: row.id, name: row.name, type: row.type, careNotes: row.care_notes };
}

function mapHousehold(row: HouseholdRow, pets: PetRow[]): ClientHousehold {
  return {
    id: row.id,
    businessId: row.business_id,
    sourceLeadId: row.source_lead_id,
    name: row.name,
    email: row.email,
    postalCode: row.postal_code,
    careNotes: row.care_notes,
    createdAt: row.created_at.getTime(),
    updatedAt: row.updated_at.getTime(),
    pets: pets.map(mapPet)
  };
}

export async function createClientHouseholdFromOwnedLead(ownerUserId: string, leadId: string) {
  if (!ownerUserId || !leadId) throw new Error('Inquiry not found.');

  return transaction(async (client) => {
    const owned = await client.query<{
      lead_id: string;
      business_id: string;
      customer_name: string;
      customer_email: string;
      postal_code: string;
      pet_types: string[];
      pet_count: number | null;
      care_details: string;
      status: string;
    }>(
      `select l.id lead_id,l.business_id,l.customer_name,l.customer_email,l.postal_code,l.pet_types,l.pet_count,l.care_details,l.status
       from lead l
       join site s on s.id=l.site_id and s.business_id=l.business_id
       join business b on b.id=l.business_id
       where l.id=$1 and b.owner_user_id=$2 and s.deleted_at is null
       for update of l`,
      [leadId, ownerUserId]
    );
    const lead = owned.rows[0];
    if (!lead) throw new Error('Inquiry not found.');
    if (!canSaveClientFromLead(lead.status as LeadStatus)) {
      throw new Error('Qualify the inquiry before saving this client.');
    }

    const householdResult = await client.query<HouseholdRow>(
      `insert into client_household(business_id,source_lead_id,name,email,postal_code,care_notes)
       values($1,$2,$3,$4,$5,$6)
       on conflict (source_lead_id) do nothing
       returning *`,
      [lead.business_id, lead.lead_id, lead.customer_name, lead.customer_email, lead.postal_code, lead.care_details]
    );
    const household = householdResult.rows[0] || (await client.query<HouseholdRow>(
      `select * from client_household where source_lead_id=$1 and business_id=$2`,
      [lead.lead_id, lead.business_id]
    )).rows[0];
    if (!household) throw new Error('Client household could not be saved.');
    const existingPets = await client.query<PetRow>(
      `select * from client_pet where household_id=$1 order by created_at,id`,
      [household.id]
    );
    if (existingPets.rows.length) return mapHousehold(household, existingPets.rows);

    const drafts = petDrafts(lead.pet_types, lead.pet_count);
    const insertedPets = await client.query<PetRow>(
      `insert into client_pet(household_id,name,type,care_notes)
       select $1,names.name,types.type,$4
       from unnest($2::text[]) with ordinality names(name,position)
       join unnest($3::text[]) with ordinality types(type,position) using(position)
       returning *`,
      [household.id, drafts.map((pet) => pet.name), drafts.map((pet) => pet.type), lead.care_details]
    );
    return mapHousehold(household, insertedPets.rows);
  });
}

type HouseholdListRow = {
  household_id: string;
  business_id: string;
  source_lead_id: string;
  household_name: string;
  email: string;
  postal_code: string;
  household_care_notes: string;
  household_created_at: Date;
  household_updated_at: Date;
  pet_id: string | null;
  pet_name: string | null;
  pet_type: string | null;
  pet_care_notes: string | null;
};

export async function listOwnerClientHouseholds(ownerUserId: string, limit = 100) {
  const result = await query<HouseholdListRow>(
    `with recent_households as (
       select h.* from client_household h join business b on b.id=h.business_id
       where b.owner_user_id=$1 order by h.updated_at desc limit $2
     )
     select h.id household_id,h.business_id,h.source_lead_id,h.name household_name,h.email,h.postal_code,
            h.care_notes household_care_notes,h.created_at household_created_at,h.updated_at household_updated_at,
            p.id pet_id,p.name pet_name,p.type pet_type,p.care_notes pet_care_notes
     from recent_households h
     left join client_pet p on p.household_id=h.id
     order by h.updated_at desc,p.created_at,p.id`,
    [ownerUserId, limit]
  );
  const households = new Map<string, ClientHousehold>();
  for (const row of result.rows) {
    const household = households.get(row.household_id) || {
      id: row.household_id,
      businessId: row.business_id,
      sourceLeadId: row.source_lead_id,
      name: row.household_name,
      email: row.email,
      postalCode: row.postal_code,
      careNotes: row.household_care_notes,
      createdAt: row.household_created_at.getTime(),
      updatedAt: row.household_updated_at.getTime(),
      pets: []
    };
    if (row.pet_id && row.pet_name && row.pet_type) {
      household.pets.push({ id: row.pet_id, name: row.pet_name, type: row.pet_type, careNotes: row.pet_care_notes || '' });
    }
    households.set(row.household_id, household);
  }
  return [...households.values()];
}

export async function updateOwnedClientHousehold(
  ownerUserId: string,
  householdId: string,
  input: UpdateClientHouseholdInput
) {
  householdId = recordId(householdId, 'Client household');
  const name = requiredText(input.name, 'Client name', 120);
  const email = requiredText(input.email, 'Client email', 320).toLowerCase();
  const postalCode = optionalText(input.postalCode, 'Postal code', 20);
  const careNotes = optionalText(input.careNotes, 'Household care notes', 4000);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid client email.');

  const result = await query<HouseholdRow>(
    `update client_household h
     set name=$3,email=$4,postal_code=$5,care_notes=$6,updated_at=now()
     from business b
     where h.id=$1 and h.business_id=b.id and b.owner_user_id=$2
     returning h.*`,
    [householdId, ownerUserId, name, email, postalCode, careNotes]
  );
  if (!result.rows[0]) throw new Error('Client household not found.');
  return mapHousehold(result.rows[0], []);
}

export async function updateOwnedClientPet(
  ownerUserId: string,
  householdId: string,
  petId: string,
  input: ClientPetInput
) {
  householdId = recordId(householdId, 'Client household');
  petId = recordId(petId, 'Pet profile');
  const { name, type, careNotes } = validatedPetInput(input);
  const result = await query<PetRow>(
    `update client_pet p
     set name=$4,type=$5,care_notes=$6,updated_at=now()
     from client_household h
     join business b on b.id=h.business_id
     where p.id=$2 and p.household_id=$1 and h.id=p.household_id and b.owner_user_id=$3
     returning p.*`,
    [householdId, petId, ownerUserId, name, type, careNotes]
  );
  if (!result.rows[0]) throw new Error('Pet profile not found.');
  return mapPet(result.rows[0]);
}

export async function addOwnedClientPet(ownerUserId: string, householdId: string, input: ClientPetInput) {
  householdId = recordId(householdId, 'Client household');
  const { name, type, careNotes } = validatedPetInput(input);
  const result = await query<PetRow>(
    `insert into client_pet(household_id,name,type,care_notes)
     select h.id,$3,$4,$5
     from client_household h
     join business b on b.id=h.business_id
     where h.id=$1 and b.owner_user_id=$2
     returning *`,
    [householdId, ownerUserId, name, type, careNotes]
  );
  if (!result.rows[0]) throw new Error('Client household not found.');
  return mapPet(result.rows[0]);
}
