import { query, transaction } from './db';
import { allowedBookingTransitions, parseBookingStatus, type BookingStatus } from './domain/bookings';
export type { BookingStatus } from './domain/bookings';

export type BookingPet = { id: string; name: string; type: string };

export type Booking = {
  id: string;
  businessId: string;
  householdId: string;
  sourceLeadId: string | null;
  householdName: string;
  startDate: string;
  endDate: string;
  amountCents: number;
  status: BookingStatus;
  notes: string;
  createdAt: number;
  updatedAt: number;
  pets: BookingPet[];
};

export type CreateBookingInput = {
  householdId: string;
  petIds: string[];
  startDate: string;
  endDate: string;
  amountCents: number;
  notes?: string;
};

type OwnedPetRow = {
  household_id: string;
  business_id: string;
  source_lead_id: string | null;
  household_name: string;
  pet_id: string;
  pet_name: string;
  pet_type: string;
};

type BookingRow = {
  id: string;
  business_id: string;
  household_id: string;
  source_lead_id: string | null;
  start_date: string | Date;
  end_date: string | Date;
  amount_cents: number;
  status: BookingStatus;
  notes: string;
  created_at: Date;
  updated_at: Date;
};

const dateText = (value: string | Date) => typeof value === 'string' ? value : value.toISOString().slice(0, 10);

function isDateText(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function mapBooking(row: BookingRow, householdName: string, pets: BookingPet[]): Booking {
  return {
    id: row.id,
    businessId: row.business_id,
    householdId: row.household_id,
    sourceLeadId: row.source_lead_id,
    householdName,
    startDate: dateText(row.start_date),
    endDate: dateText(row.end_date),
    amountCents: row.amount_cents,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at.getTime(),
    updatedAt: row.updated_at.getTime(),
    pets
  };
}

export async function createOwnedBooking(ownerUserId: string, input: CreateBookingInput) {
  const petIds = [...new Set(input.petIds)];
  const notes = input.notes?.trim() || '';
  if (!petIds.length) throw new Error('Choose at least one pet.');
  if (!isDateText(input.startDate) || !isDateText(input.endDate)) throw new Error('Enter valid booking dates.');
  if (input.endDate < input.startDate) throw new Error('The end date cannot be before the start date.');
  if (!Number.isInteger(input.amountCents) || input.amountCents < 100 || input.amountCents > 1_000_000) {
    throw new Error('Enter a whole-cent amount between $1 and $10,000.');
  }
  if (notes.length > 2000) throw new Error('Keep booking notes under 2,000 characters.');
  return transaction(async (client) => {
    const owned = await client.query<OwnedPetRow>(
      `select h.id household_id,h.business_id,h.source_lead_id,h.name household_name,
              p.id pet_id,p.name pet_name,p.type pet_type
       from client_household h
       join business b on b.id=h.business_id
       join client_pet p on p.household_id=h.id and p.id=any($3::uuid[])
       where h.id=$1 and b.owner_user_id=$2
       order by p.created_at,p.id
       for update of h`,
      [input.householdId, ownerUserId, petIds]
    );
    const household = owned.rows[0];
    if (!household || owned.rows.length !== petIds.length) throw new Error('Choose pets from this client household.');

    const created = await client.query<BookingRow>(
      `insert into booking(business_id,household_id,source_lead_id,start_date,end_date,amount_cents,notes)
       values($1,$2,$3,$4,$5,$6,$7)
       returning *`,
      [household.business_id, household.household_id, household.source_lead_id, input.startDate, input.endDate, input.amountCents, notes]
    );
    await client.query(
      `insert into booking_pet(booking_id,household_id,pet_id)
       select $1,$2,unnest($3::uuid[])`,
      [created.rows[0].id, household.household_id, petIds]
    );
    return mapBooking(created.rows[0], household.household_name, owned.rows.map((row) => ({ id: row.pet_id, name: row.pet_name, type: row.pet_type })));
  });
}

type BookingListRow = {
  booking_id: string;
  business_id: string;
  household_id: string;
  source_lead_id: string | null;
  start_date: string | Date;
  end_date: string | Date;
  amount_cents: number;
  status: BookingStatus;
  notes: string;
  booking_created_at: Date;
  booking_updated_at: Date;
  household_name: string;
  pet_id: string;
  pet_name: string;
  pet_type: string;
};

export async function listOwnerBookings(ownerUserId: string, range?: { startDate?: string; endDate?: string }): Promise<Booking[]> {
  if (range?.startDate && !isDateText(range.startDate)) throw new Error('Enter a valid range start date.');
  if (range?.endDate && !isDateText(range.endDate)) throw new Error('Enter a valid range end date.');
  if (range?.startDate && range?.endDate && range.endDate < range.startDate) throw new Error('The range end cannot be before its start.');
  const result = await query<BookingListRow>(
    `select bk.id booking_id,bk.business_id,bk.household_id,bk.source_lead_id,bk.start_date,bk.end_date,
            bk.amount_cents,bk.status,bk.notes,bk.created_at booking_created_at,bk.updated_at booking_updated_at,
            h.name household_name,p.id pet_id,p.name pet_name,p.type pet_type
     from booking bk
     join business b on b.id=bk.business_id
     join client_household h on h.id=bk.household_id and h.business_id=bk.business_id
     join booking_pet bp on bp.booking_id=bk.id and bp.household_id=bk.household_id
     join client_pet p on p.id=bp.pet_id and p.household_id=bp.household_id
     where b.owner_user_id=$1
       and ($2::date is null or bk.end_date >= $2::date)
       and ($3::date is null or bk.start_date <= $3::date)
     order by bk.start_date,bk.created_at,bk.id,p.created_at,p.id`,
    [ownerUserId, range?.startDate || null, range?.endDate || null]
  );
  const bookings = new Map<string, Booking>();
  for (const row of result.rows) {
    const booking = bookings.get(row.booking_id) || mapBooking({
      id: row.booking_id,
      business_id: row.business_id,
      household_id: row.household_id,
      source_lead_id: row.source_lead_id,
      start_date: row.start_date,
      end_date: row.end_date,
      amount_cents: row.amount_cents,
      status: row.status,
      notes: row.notes,
      created_at: row.booking_created_at,
      updated_at: row.booking_updated_at
    }, row.household_name, []);
    booking.pets.push({ id: row.pet_id, name: row.pet_name, type: row.pet_type });
    bookings.set(row.booking_id, booking);
  }
  return [...bookings.values()];
}

export async function transitionOwnedBooking(ownerUserId: string, bookingId: string, status: unknown) {
  const next = parseBookingStatus(status);
  if (!next) return false;
  return transaction(async (client) => {
    const result = await client.query<{ status: BookingStatus }>(
      `select bk.status
       from booking bk
       join business b on b.id=bk.business_id
       where bk.id=$1 and b.owner_user_id=$2
       for update of bk`,
      [bookingId, ownerUserId]
    );
    const current = result.rows[0]?.status;
    if (!current || !allowedBookingTransitions(current).includes(next)) return false;
    await client.query(`update booking set status=$2,updated_at=now() where id=$1`, [bookingId, next]);
    return true;
  });
}
