'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from '@/components/ui/animated-icons';
import { createAuthenticatedLeadAction, type LeadSubmissionState } from '@/app/actions';
import { Spokes } from '@/components/ui/spokes';

export function MessageStarter({
  subdomain,
  sitterName,
  customer,
  submissionToken,
}: {
  subdomain: string;
  sitterName: string;
  customer: { name: string; email: string };
  submissionToken: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<LeadSubmissionState, FormData>(createAuthenticatedLeadAction, {});

  useEffect(() => {
    if (state.success && state.conversationToken) {
      router.replace(`/conversation/${state.conversationToken}`);
    }
  }, [router, state.conversationToken, state.success]);

  return (
    <form action={action} className="mt-7 space-y-5">
      <input type="hidden" name="subdomain" value={subdomain} />
      <input type="hidden" name="submissionToken" value={submissionToken} />
      <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm">
        <p className="font-medium">Messaging as {customer.name}</p>
        <p className="mt-0.5 text-muted-foreground">{customer.email}</p>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Your message</span>
        <textarea
          name="details"
          required
          maxLength={2000}
          rows={6}
          autoFocus
          placeholder={`What would you like to ask ${sitterName}?`}
          className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:ring-2 focus:ring-ring/40"
        />
      </label>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <button disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">
        {pending ? <Spokes className="size-4" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {pending ? 'Starting chat...' : `Message ${sitterName}`}
      </button>
    </form>
  );
}
