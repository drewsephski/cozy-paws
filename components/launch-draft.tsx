'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { launchDraftAction, type LaunchDraftState } from '@/app/actions';
import { rootDomain } from '@/lib/utils';

type Draft = Record<'subdomain' | 'icon' | 'businessName' | 'tagline' | 'location' | 'services' | 'email' | 'phone', string>;

export function LaunchDraft() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, action, pending] = useActionState<LaunchDraftState, FormData>(launchDraftAction, {});

  useEffect(() => {
    try {
      setDraft(JSON.parse(window.localStorage.getItem('sitterfolio-draft') || 'null') as Draft | null);
    } catch {
      setDraft(null);
    }
  }, []);

  if (!draft) return <main className="mx-auto max-w-xl px-5 py-20 text-center"><h1 className="text-3xl font-semibold">Your draft isn’t in this browser.</h1><Button asChild className="mt-6"><Link href="/">Start a new site</Link></Button></main>;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center px-5 py-12">
      <section className="w-full rounded-2xl border border-border bg-card p-7 text-center shadow-lg sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Rocket className="size-7" /></span>
        <p className="mt-6 text-sm font-medium text-emerald-700">Ready to launch</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{draft.businessName}</h1>
        <p className="mt-3 text-muted-foreground">Your site will be published at <strong className="text-foreground">{draft.subdomain}.{rootDomain}</strong>.</p>
        <form action={action} className="mt-8">
          {Object.entries(draft).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          {state.error && <p role="alert" className="mb-4 text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="lg" disabled={pending}>{pending ? 'Launching…' : 'Launch my site'}</Button>
          <Button asChild type="button" size="lg" variant="ghost" className="ml-2"><Link href="/build">Keep editing</Link></Button>
        </form>
      </section>
    </main>
  );
}
