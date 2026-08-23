'use client';

import { useActionState, useEffect, useState } from 'react';
import { CalendarDays, Check, PawPrint } from 'lucide-react';
import { createBookingAction, transitionBookingAction, type CreateBookingState, type TransitionBookingState } from '@/app/actions';
import type { Booking } from '@/lib/bookings';
import { allowedBookingTransitions, type BookingStatus } from '@/lib/domain/bookings';
import type { ClientHousehold } from '@/lib/client-households';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/date-range-picker';
import { Spokes } from '@/components/ui/spokes';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function dateLabel(startDate: string, endDate: string) {
  const start = dateFormatter.format(new Date(`${startDate}T00:00:00Z`));
  const end = dateFormatter.format(new Date(`${endDate}T00:00:00Z`));
  return startDate === endDate ? start : `${start} – ${end}`;
}

const transitionLabels: Record<BookingStatus, string> = { DRAFT: 'Save as draft', CONFIRMED: 'Confirm', COMPLETED: 'Complete', CANCELLED: 'Cancel' };

function BookingTransitionButton({ bookingId, status }: { bookingId: string; status: BookingStatus }) {
  const [state, action, pending] = useActionState<TransitionBookingState, FormData>(transitionBookingAction, {});
  return <form action={action}><input type="hidden" name="bookingId" value={bookingId} /><button disabled={pending} name="status" value={status} className={`${status === 'CANCELLED' ? 'border' : 'bg-primary text-primary-foreground'} inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60`}>{pending && <Spokes className="size-4" aria-hidden="true" />}{pending ? 'Updating...' : transitionLabels[status]}</button>{state.error && <p role="alert" className="mt-2 text-sm text-destructive">{state.error}</p>}</form>;
}

function BookingList({ title, empty, bookings }: { title: string; empty: string; bookings: Booking[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {!bookings.length ? <p className="mt-3 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{empty}</p> : (
        <div className="mt-3 space-y-3">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-24px_rgba(0,0,0,.35)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{dateLabel(booking.startDate, booking.endDate)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{booking.householdName} · {booking.pets.map((pet) => pet.name).join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{currencyFormatter.format(booking.amountCents / 100)}</p>
                  <span className="mt-1 inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{booking.status.toLowerCase()}</span>
                </div>
              </div>
              {booking.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{booking.notes}</p>}
              {!!allowedBookingTransitions(booking.status).length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {allowedBookingTransitions(booking.status).map((status) => <BookingTransitionButton bookingId={booking.id} status={status} key={status} />)}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function localDateText(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Bookings({ households, bookings }: { households: ClientHousehold[]; bookings: Booking[] }) {
  const [householdId, setHouseholdId] = useState(households[0]?.id || '');
  const [today, setToday] = useState<string | null>(null);
  const [state, action, pending] = useActionState<CreateBookingState, FormData>(createBookingAction, {});
  const household = households.find((item) => item.id === householdId);
  useEffect(() => setToday(localDateText(new Date())), []);
  const upcoming = today ? bookings.filter((booking) => booking.endDate >= today) : [];
  const past = today ? bookings.filter((booking) => booking.endDate < today).reverse() : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-24px_rgba(0,0,0,.35)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CalendarDays className="size-5" aria-hidden="true" /></span>
          <div><h3 className="font-semibold">Create a booking</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Choose a saved household, its pets, care dates, and agreed total.</p></div>
        </div>
        {!households.length ? <p className="mt-5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Save a qualified inquiry as a client before creating a booking.</p> : (
          <form action={action} className="mt-5 space-y-4">
            <div>
              <label htmlFor="booking-household" className="mb-1.5 block text-sm font-medium">Client household</label>
              <Select name="householdId" value={householdId} onValueChange={setHouseholdId}>
                <SelectTrigger id="booking-household" aria-label="Client household">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {households.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <fieldset><legend className="text-sm font-medium">Pets</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{household?.pets.map((pet) => <label key={pet.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm"><input type="checkbox" name="petIds" value={pet.id} /><PawPrint className="size-4 text-emerald-600" aria-hidden="true" />{pet.name}</label>)}</div></fieldset>
            <DateRangePicker required />
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Agreed total</span><div className="relative"><span className="absolute left-3 top-2.5 text-muted-foreground">$</span><input required name="amount" inputMode="decimal" placeholder="240.00" className="h-11 w-full rounded-lg border border-input bg-background pl-7 pr-3" /></div></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Notes <span className="font-normal text-muted-foreground">(optional)</span></span><textarea name="notes" maxLength={2000} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
            {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
            {state.success && <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><Check className="size-4" aria-hidden="true" />{state.success}</p>}
            <button disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground disabled:opacity-60">{pending && <Spokes className="size-4" aria-hidden="true" />}{pending ? 'Saving...' : 'Save draft booking'}</button>
          </form>
        )}
      </section>
      <div className="space-y-8">
        {!today ? <p role="status" className="text-sm text-muted-foreground">Loading booking dates...</p> : <><BookingList title="Upcoming" empty="No upcoming bookings yet." bookings={upcoming} /><BookingList title="Past" empty="Completed and past bookings will appear here." bookings={past} /></>}
      </div>
    </div>
  );
}
