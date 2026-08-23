'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import {
  sendCustomerConversationMessageAction,
  sendSitterConversationMessageAction,
  type ConversationMessageState
} from '@/app/actions';
import type { ConversationMessage } from '@/lib/conversations';

export function ConversationMessages({ messages }: { messages: ConversationMessage[] }) {
  return <div className="space-y-3" aria-label="Conversation messages">
    {messages.map((message) => {
      const customer = message.sender === 'CUSTOMER';
      return <div key={message.id} className={`flex ${customer ? 'justify-start' : 'justify-end'}`}>
        <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${customer ? 'rounded-bl-md border border-border bg-background' : 'rounded-br-md bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950'}`}>
          <p className="whitespace-pre-wrap leading-6">{message.body}</p>
          <p className={`mt-1.5 text-[10px] font-medium uppercase tracking-wide ${customer ? 'text-muted-foreground' : 'text-emerald-50/80 dark:text-emerald-950/70'}`}>{customer ? 'Pet owner' : 'Pet sitter'}</p>
        </div>
      </div>;
    })}
  </div>;
}

export function ConversationReplyForm({ participant, conversationToken, leadId, redirectAfterSend = false }: {
  participant: 'CUSTOMER' | 'SITTER';
  conversationToken?: string;
  leadId?: string;
  redirectAfterSend?: boolean;
}) {
  const action = participant === 'CUSTOMER' ? sendCustomerConversationMessageAction : sendSitterConversationMessageAction;
  const [state, formAction, pending] = useActionState<ConversationMessageState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    if (redirectAfterSend && conversationToken) router.push(`/conversation/${conversationToken}`);
    else router.refresh();
  }, [conversationToken, redirectAfterSend, router, state.sentAt, state.success]);

  return <form ref={formRef} action={formAction} className="mt-4">
    {conversationToken && <input type="hidden" name="conversationToken" value={conversationToken} />}
    {leadId && <input type="hidden" name="leadId" value={leadId} />}
    <label htmlFor={`conversation-message-${participant}`} className="mb-2 block text-xs font-semibold">{participant === 'CUSTOMER' ? 'Add another detail' : 'Reply to this request'}</label>
    <div className="flex items-end gap-2">
      <textarea id={`conversation-message-${participant}`} name="message" required maxLength={2000} rows={2} placeholder="Type a message..." className="min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
      <button disabled={pending} className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60" aria-label={pending ? 'Sending message' : 'Send message'}><Send className="size-4" aria-hidden="true" /></button>
    </div>
    {state.error && <p role="alert" className="mt-2 text-sm text-destructive">{state.error}</p>}
    {state.success && <p role="status" className="mt-2 text-xs text-muted-foreground">Message sent.</p>}
  </form>;
}
