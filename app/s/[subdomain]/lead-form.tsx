'use client';

import { useActionState } from 'react';
import { createLeadAction, type LeadSubmissionState } from '@/app/actions';

export function LeadForm({ subdomain }: { subdomain: string }) {
  const [state, action, pending] = useActionState<LeadSubmissionState, FormData>(createLeadAction, {});
  if (state.success) return <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">Thanks — I’ll follow up directly.</p>;
  return <form action={action} className="mt-5 space-y-3">
    <input type="hidden" name="subdomain" value={subdomain} />
    <label className="block"><span className="mb-1.5 block text-xs font-medium">Your name</span><input name="name" required autoComplete="name" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    <label className="block"><span className="mb-1.5 block text-xs font-medium">Email</span><input name="email" type="email" required autoComplete="email" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    <label className="block"><span className="mb-1.5 block text-xs font-medium">Dates you need care</span><input name="dates" placeholder="For example, Sept. 12–15" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    <label className="block"><span className="mb-1.5 block text-xs font-medium">Pet and care details</span><textarea name="message" placeholder="Pet, routine, and care needed" rows={3} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <button disabled={pending} className="h-10 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">{pending ? 'Sending…' : 'Send availability request'}</button>
  </form>;
}
