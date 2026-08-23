'use client';

import { useActionState } from 'react';
import { Check, Mail, MapPin, PawPrint, Pencil, Plus, Users } from 'lucide-react';
import { addClientPetAction, updateClientHouseholdAction, updateClientPetAction, type EditClientState } from '@/app/actions';
import type { ClientHousehold, ClientPet } from '@/lib/client-households';

const fieldClass = 'mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

function FormResult({ state }: { state: EditClientState }) {
  if (state.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state.success) return (
    <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
      <Check className="size-4" aria-hidden="true" />{state.success}
    </p>
  );
  return null;
}

function PetEditForm({ householdId, pet }: { householdId: string; pet: ClientPet }) {
  const [state, action, pending] = useActionState<EditClientState, FormData>(updateClientPetAction, {});
  return (
    <details className="group rounded-xl border border-border/70 bg-muted/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
        <p className="flex min-w-0 items-center gap-2 font-medium">
          <PawPrint className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="truncate">{pet.name}</span>
          <span className="font-normal text-muted-foreground">· {pet.type}</span>
        </p>
        <Pencil className="size-4 shrink-0 text-muted-foreground" aria-label={`Edit ${pet.name}`} />
      </summary>
      {pet.careNotes && (
        <p className="-mt-1 px-3 pb-2 text-sm leading-5 text-muted-foreground group-open:hidden">{pet.careNotes}</p>
      )}
      <form action={action} className="space-y-3 border-t border-border/70 p-3">
        <input type="hidden" name="householdId" value={householdId} />
        <input type="hidden" name="petId" value={pet.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Pet name<input required maxLength={120} name="name" defaultValue={pet.name} className={fieldClass} /></label>
          <label className="text-sm font-medium">Pet type<input required maxLength={80} name="type" defaultValue={pet.type} className={fieldClass} /></label>
        </div>
        <label className="block text-sm font-medium">Care notes <span className="font-normal text-muted-foreground">(optional)</span><textarea maxLength={4000} rows={3} name="careNotes" defaultValue={pet.careNotes} className={fieldClass} /></label>
        <FormResult state={state} />
        <button disabled={pending} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{pending ? 'Saving...' : 'Save pet'}</button>
      </form>
    </details>
  );
}

function HouseholdCard({ household }: { household: ClientHousehold }) {
  const [householdState, householdAction, householdPending] = useActionState<EditClientState, FormData>(updateClientHouseholdAction, {});
  const [petState, petAction, petPending] = useActionState<EditClientState, FormData>(addClientPetAction, {});
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{household.name}</h3>
          <a href={`mailto:${household.email}`} className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground underline-offset-4 hover:underline"><Mail className="size-3.5 shrink-0" aria-hidden="true" />{household.email}</a>
        </div>
        {household.postalCode && <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"><MapPin className="size-3" aria-hidden="true" />{household.postalCode}</span>}
      </div>
      <details className="mt-4 rounded-xl border border-border/70">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium"><Pencil className="size-4" aria-hidden="true" />Edit client details</summary>
        <form action={householdAction} className="space-y-3 border-t border-border/70 p-3">
          <input type="hidden" name="householdId" value={household.id} />
          <label className="block text-sm font-medium">Client or household name<input required maxLength={120} name="name" defaultValue={household.name} className={fieldClass} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Email<input required type="email" maxLength={320} name="email" defaultValue={household.email} className={fieldClass} /></label>
            <label className="text-sm font-medium">Postal code <span className="font-normal text-muted-foreground">(optional)</span><input maxLength={20} name="postalCode" defaultValue={household.postalCode} className={fieldClass} /></label>
          </div>
          <label className="block text-sm font-medium">Household care notes <span className="font-normal text-muted-foreground">(optional)</span><textarea maxLength={4000} rows={3} name="careNotes" defaultValue={household.careNotes} className={fieldClass} /></label>
          <FormResult state={householdState} />
          <button disabled={householdPending} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{householdPending ? 'Saving...' : 'Save client'}</button>
        </form>
      </details>
      <div className="mt-4 space-y-2">
        {household.pets.map((pet) => <PetEditForm key={pet.id} householdId={household.id} pet={pet} />)}
      </div>
      <details className="mt-3 rounded-xl border border-dashed border-border">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium"><Plus className="size-4" aria-hidden="true" />Add a pet</summary>
        <form action={petAction} className="space-y-3 border-t border-border p-3">
          <input type="hidden" name="householdId" value={household.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Pet name<input required maxLength={120} name="name" className={fieldClass} /></label>
            <label className="text-sm font-medium">Pet type<input required maxLength={80} name="type" placeholder="Dog, cat, rabbit..." className={fieldClass} /></label>
          </div>
          <label className="block text-sm font-medium">Care notes <span className="font-normal text-muted-foreground">(optional)</span><textarea maxLength={4000} rows={3} name="careNotes" className={fieldClass} /></label>
          <FormResult state={petState} />
          <button disabled={petPending} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{petPending ? 'Adding...' : 'Add pet'}</button>
        </form>
      </details>
    </article>
  );
}

export function ClientHouseholds({ households }: { households: ClientHousehold[] }) {
  if (!households.length) return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <Users className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-4 font-medium">No saved clients yet</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">Qualify an inquiry, then save the household so its client and pet details are ready for future care.</p>
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {households.map((household) => <HouseholdCard key={household.id} household={household} />)}
    </div>
  );
}
