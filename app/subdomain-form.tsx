'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkDraftAddressAction, type DraftAddressState } from '@/app/actions';
import { rootDomain } from '@/lib/utils';
import { petIconOptions } from '@/lib/pet-icons';
import { PetIcon } from '@/components/pet-icon';

import { useRouter } from 'next/navigation';

function SubdomainInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="subdomain">Your site address</Label>
      <div className="flex items-center">
        <div className="relative flex-1">
          <Input
            id="subdomain"
            name="subdomain"
            placeholder="happy-tails"
            defaultValue={defaultValue}
            className="w-full rounded-r-none focus:z-10"
            required
          />
        </div>
        <span className="flex min-h-9 items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
          .{rootDomain}
        </span>
      </div>
    </div>
  );
}

function IconPicker({
  icon,
  setIcon
}: {
  icon: string;
  setIcon: (icon: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Choose a pet</Label>
      <input type="hidden" name="icon" value={icon} required />
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Pet icon">
        {petIconOptions.map((pet) => (
          <button
            key={pet.id}
            type="button"
            onClick={() => setIcon(pet.id)}
            aria-label={pet.label}
            aria-pressed={icon === pet.id}
            className="group flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-input bg-background transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:ring-2 aria-pressed:ring-primary/20"
          >
            <PetIcon value={pet.id} className="size-6 transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-medium leading-none text-muted-foreground group-aria-pressed:text-primary">{pet.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Pick an icon for your draft. You can replace it with a photo later.</p>
    </div>
  );
}

export function SubdomainForm() {
  const router = useRouter();
  const [icon, setIcon] = useState('');

  const [state, action, isPending] = useActionState<DraftAddressState, FormData>(
    checkDraftAddressAction,
    {}
  );

  useEffect(() => {
    if (!state.success || !state.subdomain || !state.icon) return;
    window.localStorage.setItem('sitterfolio-draft', JSON.stringify({ subdomain: state.subdomain, icon: state.icon }));
    router.push('/build');
  }, [router, state]);

  return (
    <form action={action} className="space-y-4">
      <SubdomainInput defaultValue={state?.subdomain} />

      <IconPicker icon={icon} setIcon={setIcon} />

      {state?.error && (
        <div className="text-sm text-red-500">{state.error}</div>
      )}

      <Button type="submit" className="w-full" disabled={isPending || !icon}>
        {isPending ? 'Checking your address...' : 'Start building free'}
      </Button>
    </form>
  );
}
