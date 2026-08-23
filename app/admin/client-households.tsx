import { Mail, MapPin, PawPrint, Users } from 'lucide-react';
import type { ClientHousehold } from '@/lib/client-households';

export function ClientHouseholds({ households }: { households: ClientHousehold[] }) {
  if (!households.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Users className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-4 font-medium">No saved clients yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">Qualify an inquiry, then save the household so its client and pet details are ready for future care.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {households.map((household) => (
        <article key={household.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">{household.name}</h3>
              <a href={`mailto:${household.email}`} className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground underline-offset-4 hover:underline"><Mail className="size-3.5 shrink-0" aria-hidden="true" />{household.email}</a>
            </div>
            {household.postalCode && <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"><MapPin className="size-3" aria-hidden="true" />{household.postalCode}</span>}
          </div>
          <div className="mt-5 space-y-2">
            {household.pets.map((pet) => (
              <div key={pet.id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="flex items-center gap-2 font-medium"><PawPrint className="size-4 text-emerald-600" aria-hidden="true" />{pet.name}<span className="font-normal text-muted-foreground">· {pet.type}</span></p>
                {pet.careNotes && <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">{pet.careNotes}</p>}
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
