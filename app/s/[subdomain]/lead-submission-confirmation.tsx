import { Check } from 'lucide-react';
import Link from 'next/link';
import { ConversationMessages, ConversationReplyForm } from '@/components/conversation-thread';
import type { LeadSubmissionState } from '@/app/actions';

export function LeadSubmissionConfirmation({ sitterName, state }: { sitterName: string; state: LeadSubmissionState }) {
  const token = state.conversationToken;
  const initialMessage = state.initialMessage || state.serviceRequested || 'Availability request';
  return (
    <div role="status" className="flex flex-1 flex-col rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
      <div>
        <div className="mb-4 grid size-10 place-items-center rounded-full bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950">
          <Check className="size-6" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-300">Request sent</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight">Your conversation with {sitterName} has started.</h2>
        <p className="mt-2 text-sm leading-5 text-emerald-800 dark:text-emerald-200">We’ll email you when {sitterName} replies. No account needed.</p>
      </div>
      {token ? <div className="mt-5 border-t border-emerald-200 pt-4 dark:border-emerald-800">
        <ConversationMessages messages={[{ id: 'initial-request', sender: 'CUSTOMER', body: initialMessage, createdAt: state.createdAt || 0 }]} />
        <ConversationReplyForm participant="CUSTOMER" conversationToken={token} redirectAfterSend />
        <Link href={`/conversation/${token}`} className="mt-3 inline-block text-xs font-medium underline underline-offset-4">Open your private conversation</Link>
      </div> : <p className="mt-6 border-t border-emerald-200 pt-5 text-sm dark:border-emerald-800">Keep an eye on your inbox for availability and next steps.</p>}
    </div>
  );
}
