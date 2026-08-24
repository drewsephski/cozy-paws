'use client';

import { useMemo, useState, useTransition } from 'react';
import { MessageCircle } from '@/components/ui/animated-icons';
import { markLeadReadAction } from '@/app/actions';
import { ConversationMessages, ConversationReplyForm } from '@/components/conversation-thread';
import type { ConversationMessage } from '@/lib/conversations';
import type { OwnedLead } from '@/lib/profile-ownership';
import { formatInquiryDateRange, groupLeadsByEmail } from './lead-inbox-model';
import { canReopenLead } from '@/lib/domain/leads';

function fullConversation(lead: OwnedLead, messages: ConversationMessage[]) {
  return [{ id: `lead-${lead.id}`, sender: 'CUSTOMER' as const, body: lead.message || lead.serviceRequested || 'Availability request', createdAt: lead.createdAt }, ...messages];
}

export function MessagesInbox({ leads, conversationMessages }: { leads: OwnedLead[]; conversationMessages: Record<string, ConversationMessage[]> }) {
  const conversations = useMemo(() => groupLeadsByEmail(leads.filter((lead) => lead.id in conversationMessages)), [conversationMessages, leads]);
  const [selectedEmail, setSelectedEmail] = useState(() => conversations.find(({ leads: groupedLeads }) => groupedLeads.some((lead) => !lead.readAt))?.email ?? conversations[0]?.email ?? null);
  const [isPending, startTransition] = useTransition();
  const selectedConversation = conversations.find(({ email }) => email === selectedEmail) ?? conversations[0];
  const selectedLead = selectedConversation?.leads.find((lead) => !canReopenLead(lead.status)) ?? selectedConversation?.leads[0];

  function selectConversation(email: string, groupedLeads: OwnedLead[]) {
    setSelectedEmail(email);
    const unreadLeads = groupedLeads.filter((lead) => !lead.readAt);
    if (!unreadLeads.length) return;
    startTransition(() => {
      for (const lead of unreadLeads) {
        const formData = new FormData();
        formData.set('subdomain', lead.subdomain);
        formData.set('leadId', lead.id);
        void markLeadReadAction(formData);
      }
    });
  }

  if (!conversations.length) return <div className="rounded-2xl border border-dashed border-border p-10 text-center"><MessageCircle className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-4 font-medium">No messages yet</p><p className="mt-1 text-sm text-muted-foreground">New pet-owner conversations will appear here.</p></div>;

  return <div className="grid min-h-[34rem] overflow-hidden rounded-xl bg-card ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-24px_rgba(0,0,0,.35)] md:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.6fr)]">
    <aside className="border-b border-border md:border-b-0 md:border-r" aria-label="Conversations">
      <div className="border-b border-border px-4 py-3"><p className="text-sm font-semibold">All conversations</p><p className="text-xs text-muted-foreground">{conversations.length} {conversations.length === 1 ? 'thread' : 'threads'}</p></div>
      <div className="max-h-72 overflow-y-auto md:max-h-[30rem]">
        {conversations.map(({ email, leads: groupedLeads }) => {
          const lead = groupedLeads[0];
          const messages = groupedLeads.flatMap((item) => fullConversation(item, conversationMessages[item.id])).sort((a, b) => a.createdAt - b.createdAt);
          const latest = messages[messages.length - 1];
          const selected = selectedConversation?.email === email;
          const unread = groupedLeads.some((item) => !item.readAt);
          return <button key={email} type="button" onClick={() => selectConversation(email, groupedLeads)} aria-current={selected ? 'true' : undefined} className={`flex w-full gap-3 border-b border-border/70 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted ${selected ? 'bg-muted/60' : ''}`}>
            <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{lead.name.slice(0, 1).toUpperCase()}{unread && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" aria-label="Unread" />}</span>
            <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className="truncate text-sm font-semibold">{lead.name}</span><span className="shrink-0 text-[10px] text-muted-foreground">{groupedLeads.length > 1 ? `${groupedLeads.length} requests` : lead.siteName}</span></span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{latest.body}</span></span>
          </button>;
        })}
      </div>
    </aside>
    {selectedLead && <section className="flex min-w-0 flex-col">
      <header className="border-b border-border px-5 py-4"><div className="flex items-baseline justify-between gap-4"><div className="min-w-0"><h2 className="truncate font-semibold">{selectedLead.name}</h2><p className="truncate text-xs text-muted-foreground">{selectedLead.email}</p></div><span className="shrink-0 text-xs text-muted-foreground">{selectedLead.siteName}</span></div><p className="mt-2 text-xs text-muted-foreground">{selectedLead.serviceRequested || 'Pet care'} · {formatInquiryDateRange(selectedLead)}</p></header>
      <div className="flex-1 overflow-y-auto bg-muted/20 p-5"><ConversationMessages messages={selectedConversation.leads.flatMap((lead) => fullConversation(lead, conversationMessages[lead.id])).sort((a, b) => a.createdAt - b.createdAt)} /></div>
      <div className="border-t border-border bg-card px-5 pb-5">{canReopenLead(selectedLead.status) ? <p className="pt-4 text-xs text-muted-foreground">This conversation is closed. Reopen it from Leads before replying.</p> : <ConversationReplyForm participant="SITTER" leadId={selectedLead.id} />}{isPending && <p className="mt-2 text-xs text-muted-foreground" role="status">Marking conversation read...</p>}</div>
    </section>}
  </div>;
}
