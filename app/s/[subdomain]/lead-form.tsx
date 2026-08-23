'use client';

import { useActionState } from 'react';
import { createLeadAction, type LeadSubmissionState } from '@/app/actions';
import { LeadSubmissionConfirmation } from './lead-submission-confirmation';
import { DateRangePicker } from '@/components/date-range-picker';

export function LeadForm({ subdomain, sitterName }: { subdomain: string; sitterName: string }) {
  const [state, action, pending] = useActionState<LeadSubmissionState, FormData>(createLeadAction, {});
  return <div className="flex min-h-[31rem] flex-col">
    {state.success ? <LeadSubmissionConfirmation sitterName={sitterName} state={state} /> : <>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Ask about availability</p>
      <h2 className="text-xl font-semibold">Tell me about your pet</h2>
      <p className="mt-1.5 text-sm leading-5 text-muted-foreground">Send your dates and care details. I&apos;ll reply by email.</p>
      <form action={action} className="mt-4 space-y-2.5">
    <input type="hidden" name="subdomain" value={subdomain} />
    <input type="hidden" name="source" value="sitterfolio_site" />
    <label className="block"><span className="mb-1 block text-xs font-medium">Your name</span><input name="name" required autoComplete="name" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    <label className="block"><span className="mb-1 block text-xs font-medium">Email</span><input name="email" type="email" required autoComplete="email" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    <label className="block"><span className="mb-1 block text-xs font-medium">Service needed</span><input name="service" placeholder="Overnight care, walks, drop-ins..." className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    <DateRangePicker compact />
    <div className="grid grid-cols-[1fr_6rem] gap-3"><label className="block"><span className="mb-1 block text-xs font-medium">Pet types</span><input name="petTypes" placeholder="Dog, cat" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label><label className="block"><span className="mb-1 block text-xs font-medium">Count</span><input name="petCount" type="number" min="1" max="50" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label></div>
    <label className="block"><span className="mb-1 block text-xs font-medium">ZIP code</span><input name="postalCode" autoComplete="postal-code" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    <label className="block"><span className="mb-1 block text-xs font-medium">Pet and care details</span><textarea name="details" placeholder="Pet, routine, and care needed" rows={2} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        <button disabled={pending} className="h-10 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">{pending ? 'Sending...' : 'Send availability request'}</button>
      </form>
    </>}
  </div>;
}
