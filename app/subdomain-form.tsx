'use client';

import { useActionState, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { checkDraftAddressAction, type DraftAddressState } from '@/app/actions';
import { PetIcon } from '@/components/pet-icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { petIconOptions } from '@/lib/pet-icons';
import { cn, rootDomain } from '@/lib/utils';

const steps = ['Address', 'Pet icon', 'Review'] as const;

function Progress({ step }: { step: number }) {
  return <div className="grid grid-cols-3 gap-2" aria-label={`Step ${step} of ${steps.length}: ${steps[step - 1]}`}>
    {steps.map((label, index) => {
      const active = index + 1 <= step;
      return <div key={label} className="space-y-2"><div className={cn('h-1 rounded-full bg-muted', active && 'bg-primary')} /><p className={cn('text-xs text-muted-foreground', index + 1 === step && 'font-medium text-foreground')}>{label}</p></div>;
    })}
  </div>;
}

export function StartSiteDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [subdomain, setSubdomain] = useState('');
  const [icon, setIcon] = useState('');
  const [state, action, isPending] = useActionState<DraftAddressState, FormData>(checkDraftAddressAction, {});

  useEffect(() => {
    if (state.error) setStep(1);
    if (!state.success || !state.subdomain || !state.icon) return;
    window.localStorage.setItem('sitterfolio-draft', JSON.stringify({ subdomain: state.subdomain, icon: state.icon }));
    router.push('/build');
  }, [router, state]);

  const cleanSubdomain = subdomain.trim().toLowerCase();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (step === 3) return;
    event.preventDefault();
    if (step === 1 && cleanSubdomain.length >= 3) setStep(2);
    if (step === 2 && icon) setStep(3);
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setStep(1); }}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-x-clip overflow-y-auto border-border/80 p-0 sm:max-w-xl data-[state=open]:slide-in-from-right-8">
      <form action={action} className="min-w-0" onSubmit={handleSubmit}>
        <input type="hidden" name="subdomain" value={cleanSubdomain} />
        <input type="hidden" name="icon" value={icon} />
        <DialogHeader className="border-b px-6 pb-5 pt-6 pr-14 text-left">
          <div className="mb-4"><Progress step={step} /></div>
          <DialogTitle className="text-2xl tracking-[-.025em]">{step === 1 ? 'Choose your site address' : step === 2 ? 'Pick your pet icon' : 'Your draft is ready to begin'}</DialogTitle>
          <DialogDescription>{step === 1 ? 'This becomes the link you share with clients.' : step === 2 ? 'Choose a placeholder. You can add your photo later.' : 'Confirm the details, then open the site builder.'}</DialogDescription>
        </DialogHeader>

        <div className="min-h-[18rem] px-6 py-6">
          {step === 1 && <div className="space-y-3">
            <Label htmlFor="dialog-subdomain">Your site address</Label>
            <div className="flex items-center"><Input id="dialog-subdomain" value={subdomain} onChange={(event) => setSubdomain(event.target.value)} placeholder="happy-tails" autoComplete="off" className="h-11 rounded-r-none focus:z-10" required autoFocus aria-describedby="address-help address-error" /><span className="flex h-11 shrink-0 items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">.{rootDomain}</span></div>
            <p id="address-help" className="text-xs text-muted-foreground">Use letters, numbers, and hyphens. Keep it short enough to say aloud.</p>
            <div id="address-error" className="min-h-5" aria-live="polite">{state.error && <p className="text-sm text-destructive">{state.error}</p>}</div>
          </div>}

          {step === 2 && <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Pet icon">
            {petIconOptions.map((pet) => <button key={pet.id} type="button" onClick={() => setIcon(pet.id)} aria-label={pet.label} aria-checked={icon === pet.id} role="radio" className="group flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-input bg-background transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:border-primary aria-checked:bg-primary/10 aria-checked:text-primary aria-checked:ring-2 aria-checked:ring-primary/20"><PetIcon value={pet.id} className="size-6" /><span className="text-[11px] font-medium leading-none">{pet.label}</span></button>)}
          </div>}

          {step === 3 && <div className="rounded-xl border bg-muted/30 p-5"><div className="flex min-w-0 items-center gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><PetIcon value={icon} className="size-6" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Your new address</p><p className="break-all text-lg font-semibold">{cleanSubdomain}.{rootDomain}</p></div><Check aria-hidden="true" className="ml-auto size-5 shrink-0 text-primary" /></div><p className="mt-5 border-t pt-4 text-sm leading-6 text-muted-foreground">Next, you&apos;ll add your business name, services, service area, and contact details in the builder.</p></div>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4">
          {step > 1 ? <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" />Back</Button> : <span />}
          {step < 3 ? <Button type="button" onClick={() => setStep((current) => current + 1)} disabled={step === 1 ? cleanSubdomain.length < 3 : !icon}>Next<ArrowRight aria-hidden="true" /></Button> : <Button type="submit" disabled={isPending}>{isPending ? 'Checking address…' : 'Start building'}<ArrowRight aria-hidden="true" /></Button>}
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

export function HeroStartButton() {
  return <StartSiteDialog><button type="button" className="landing-cta">Start building free<ArrowRight aria-hidden="true" className="size-4" /></button></StartSiteDialog>;
}

export function SubdomainForm() {
  const router = useRouter();
  const [icon, setIcon] = useState('');
  const [state, action, isPending] = useActionState<DraftAddressState, FormData>(checkDraftAddressAction, {});

  useEffect(() => {
    if (!state.success || !state.subdomain || !state.icon) return;
    window.localStorage.setItem('sitterfolio-draft', JSON.stringify({ subdomain: state.subdomain, icon: state.icon }));
    router.push('/build');
  }, [router, state]);

  return <form action={action} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="subdomain">Your site address</Label>
      <div className="flex items-center"><Input id="subdomain" name="subdomain" placeholder="happy-tails" defaultValue={state.subdomain} className="w-full rounded-r-none focus:z-10" required /><span className="flex min-h-9 items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">.{rootDomain}</span></div>
    </div>

    <div className="space-y-2">
      <Label>Choose a pet</Label>
      <input type="hidden" name="icon" value={icon} required />
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Pet icon">
        {petIconOptions.map((pet) => <button key={pet.id} type="button" onClick={() => setIcon(pet.id)} aria-label={pet.label} aria-checked={icon === pet.id} role="radio" className="group flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-input bg-background transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:border-primary aria-checked:bg-primary/10 aria-checked:text-primary aria-checked:ring-2 aria-checked:ring-primary/20"><PetIcon value={pet.id} className="size-6" /><span className="text-[10px] font-medium leading-none">{pet.label}</span></button>)}
      </div>
      <p className="text-xs text-muted-foreground">Pick an icon for your draft. You can replace it with a photo later.</p>
    </div>

    <div className="min-h-5" aria-live="polite">{state.error && <p className="text-sm text-destructive">{state.error}</p>}</div>
    <Button type="submit" className="w-full" disabled={isPending || !icon}>{isPending ? 'Checking your address…' : 'Start building free'}</Button>
  </form>;
}
