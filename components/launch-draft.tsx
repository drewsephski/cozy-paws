'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PetIcon } from '@/components/pet-icon';
import { launchDraftAction, type LaunchDraftState } from '@/app/actions';
import { rootDomain } from '@/lib/utils';

type Draft = Record<'subdomain' | 'icon' | 'sitterName' | 'businessName' | 'tagline' | 'location' | 'services' | 'email' | 'phone', string>;

export function LaunchDraft() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ready, setReady] = useState(false);
  const [state, action, pending] = useActionState<LaunchDraftState, FormData>(launchDraftAction, {});

  useEffect(() => {
    try {
      setDraft(JSON.parse(window.localStorage.getItem('sitterfolio-draft') || 'null') as Draft | null);
    } catch {
      setDraft(null);
    } finally {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-5 py-12 text-sm text-muted-foreground">Loading your draft...</main>;
  }

  if (!draft) return <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-5 py-20 text-center"><h1 className="text-3xl font-semibold tracking-[-.025em]">We couldn&apos;t find a draft in this browser.</h1><Button asChild className="mt-7" size="lg"><Link href="/">Start a new site <ArrowRight /></Link></Button></main>;

  const businessName = draft.businessName.trim();
  const sitterName = draft.sitterName?.trim() || '';
  const displayName = sitterName || businessName;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center px-5 py-8 lg:px-8 lg:py-12">
      <section className="grid w-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_20px_60px_-44px_rgba(0,0,0,.35)] md:grid-cols-[minmax(0,1.12fr)_minmax(18rem,.88fr)]">
        <div className="flex flex-col justify-center px-6 py-8 sm:px-9 sm:py-10 lg:px-12">
          <h1 className="max-w-xl text-3xl font-semibold tracking-[-.025em] text-balance sm:text-4xl">Ready to launch {displayName || 'your site'}?</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Publish your site at <strong className="font-medium text-foreground">{draft.subdomain}.{rootDomain}</strong>.</p>
          <form action={action} className="mt-7">
          {Object.entries(draft).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            {state.error && <p role="alert" className="mb-5 max-w-lg rounded-xl bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">{state.error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="submit" disabled={pending} className="h-10 px-4">
                {pending ? 'Launching...' : <>Launch my site <ArrowRight /></>}
              </Button>
              <Button asChild type="button" variant="ghost" className="h-10 px-4"><Link href="/build"><ArrowLeft />Keep editing</Link></Button>
            </div>
          </form>
        </div>

        <div className="flex min-h-[18rem] flex-col justify-between border-t border-border bg-muted/35 p-6 md:min-h-[24rem] md:border-l md:border-t-0 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Globe2 aria-hidden="true" className="size-4" />
            Site preview
          </div>
          <div className="py-7 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <PetIcon value={draft.icon} className="size-8" />
            </div>
            <p className="mt-4 text-lg font-semibold tracking-tight text-balance">{displayName || 'Your Sitterfolio'}</p>
            {sitterName && businessName && <p className="mt-1 text-sm text-muted-foreground">{businessName}</p>}
            {draft.location && <p className="mt-1 text-sm text-muted-foreground">{draft.location}</p>}
          </div>
          <div className="truncate rounded-lg border border-border bg-background px-3 py-2.5 text-center text-xs text-muted-foreground">
            {draft.subdomain}.{rootDomain}
          </div>
        </div>
      </section>
    </main>
  );
}
