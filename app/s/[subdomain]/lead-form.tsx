'use client';

import { useActionState, useEffect } from 'react';
import { createLeadAction, type LeadSubmissionState } from '@/app/actions';
import { LeadSubmissionConfirmation } from './lead-submission-confirmation';
import { DateRangePicker } from '@/components/date-range-picker';
import { Spokes } from '@/components/ui/spokes';

export function LeadForm({ subdomain, sitterName, services = [], submissionToken, onConversationStarted }: { subdomain: string; sitterName: string; services?: string[]; submissionToken: string; onConversationStarted?: (conversationToken: string) => void }) {
  const [state, action, pending] = useActionState<LeadSubmissionState, FormData>(createLeadAction, {});
  const conversationToken = state.success ? state.conversationToken : undefined;

  useEffect(() => {
    if (conversationToken) onConversationStarted?.(conversationToken);
  }, [conversationToken, onConversationStarted]);

  return <div className="flex min-h-[31rem] flex-col">
    {state.success ? <LeadSubmissionConfirmation sitterName={sitterName} state={state} /> : <>
      <h2 className="text-2xl font-semibold tracking-tight">Ask about availability</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Share a few details with {sitterName}. This starts a private conversation, and replies arrive by email.</p>
      <form action={action} className="mt-5 space-y-4">
    <input type="hidden" name="subdomain" value={subdomain} />
    <input type="hidden" name="source" value="sitterfolio_site" />
    <input type="hidden" name="submissionToken" value={submissionToken} />
    <fieldset className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3"><legend className="px-1 text-sm font-semibold">Start with the basics</legend><p className="text-xs leading-5 text-muted-foreground">Name, email, service, and dates help {sitterName} tell you if the care is a fit.</p>
      <label className="block"><span className="mb-1 block text-xs font-medium">Your name</span><input name="name" required autoComplete="name" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium">Email</span><input name="email" type="email" required autoComplete="email" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium">Service needed</span><input name="service" list={services.length ? `services-${subdomain}` : undefined} placeholder={services[0] || 'Overnight care, walks, drop-ins...'} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />{services.length > 0 && <datalist id={`services-${subdomain}`}>{services.map((service) => <option key={service} value={service} />)}</datalist>}</label>
      <DateRangePicker compact />
    </fieldset>
    <details className="rounded-xl border border-border/70 px-3 py-2"><summary className="cursor-pointer list-none text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">Add helpful pet details <span className="ml-1 text-xs font-normal text-muted-foreground">optional</span></summary><div className="space-y-3 pb-1 pt-3">
      <div className="grid grid-cols-[1fr_6rem] gap-3"><label className="block"><span className="mb-1 block text-xs font-medium">Pet types</span><input name="petTypes" placeholder="Dog, cat" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label><label className="block"><span className="mb-1 block text-xs font-medium">Count</span><input name="petCount" type="number" min="1" max="50" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label></div>
      <label className="block"><span className="mb-1 block text-xs font-medium">ZIP code</span><input name="postalCode" autoComplete="postal-code" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium">Pet and care details</span><textarea name="details" placeholder="Pet, routine, and care needed" rows={2} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    </div></details>
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        <button disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{pending && <Spokes className="size-4" aria-hidden="true" />}{pending ? 'Sending request…' : 'Request availability'}</button>
        <p className="text-center text-xs leading-5 text-muted-foreground">No account needed. Your details are shared only with {sitterName}.</p>
      </form>
    </>}
  </div>;
}
