'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Globe2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PetIcon } from '@/components/pet-icon';
import { launchDraftAction, type LaunchDraftState } from '@/app/actions';
import { rootDomain } from '@/lib/utils';

type Draft = Record<'subdomain' | 'icon' | 'businessName' | 'tagline' | 'location' | 'services' | 'email' | 'phone', string>;

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

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-5 py-10 lg:px-8 lg:py-16">
      <section className="grid w-full overflow-hidden rounded-2xl bg-card shadow-[0_28px_90px_-52px_rgba(6,78,59,.45)] lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,.82fr)]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <span className="grid size-12 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"><Rocket aria-hidden="true" className="size-6" /></span>
          <h1 className="mt-7 max-w-xl text-4xl font-semibold tracking-[-.035em] text-balance sm:text-5xl lg:text-6xl">Ready to launch {businessName || 'your site'}?</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Your site will be published at <strong className="font-semibold text-foreground">{draft.subdomain}.{rootDomain}</strong>.</p>
          <form action={action} className="mt-9">
          {Object.entries(draft).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            {state.error && <p role="alert" className="mb-5 max-w-lg rounded-xl bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">{state.error}</p>}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" size="lg" disabled={pending} className="h-12 px-6 text-base shadow-[0_12px_28px_-14px_rgba(6,95,70,.75)]">
                {pending ? 'Launching...' : <>Launch my site <ArrowRight /></>}
              </Button>
              <Button asChild type="button" size="lg" variant="ghost" className="h-12 px-5 text-base"><Link href="/build"><ArrowLeft />Keep editing</Link></Button>
            </div>
          </form>
        </div>

        <div className="relative flex min-h-[22rem] flex-col justify-between overflow-hidden bg-emerald-950 p-7 text-emerald-50 sm:p-10 lg:min-h-[34rem]">
          <div aria-hidden="true" className="absolute -right-24 -top-24 size-72 rounded-full border border-emerald-300/10" />
          <div aria-hidden="true" className="absolute -right-10 -top-10 size-44 rounded-full border border-emerald-300/15" />
          <div className="relative flex items-center gap-2 text-sm font-medium text-emerald-200">
            <Globe2 aria-hidden="true" className="size-4" />
            Your new home on the web
          </div>
          <div className="relative py-10 text-center">
            <div className="mx-auto grid size-24 place-items-center rounded-full bg-emerald-50 text-emerald-900 shadow-[0_20px_44px_-18px_rgba(0,0,0,.6)]">
              <PetIcon value={draft.icon} className="size-12" />
            </div>
            <p className="mt-7 text-2xl font-semibold tracking-[-.02em] text-balance">{businessName || 'Your Sitterfolio'}</p>
            {draft.location && <p className="mt-2 text-sm text-emerald-200">{draft.location}</p>}
          </div>
          <div className="relative rounded-xl bg-emerald-900/70 px-4 py-3 text-center text-sm text-emerald-100 ring-1 ring-inset ring-white/10">
            {draft.subdomain}.{rootDomain}
          </div>
        </div>
      </section>
    </main>
  );
}
