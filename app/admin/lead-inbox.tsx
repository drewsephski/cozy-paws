'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { createPaymentRequestAction, markLeadGroupReadAction, saveClientFromLeadAction, updateLeadStatusAction, type PaymentRequestState, type SaveClientState } from '@/app/actions';
import { useActionState } from 'react';
import type { OwnedLead } from '@/lib/profile-ownership';
import { canReopenLead, canRequestPayment, canSaveClientFromLead } from '@/lib/domain/leads';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarPlus, Check, ChevronDown, Copy, UserRoundPlus } from 'lucide-react';
import { ConversationMessages, ConversationReplyForm } from '@/components/conversation-thread';
import type { ConversationMessage } from '@/lib/conversations';
import { buildSiteFilterOptions, formatInquiryDateRange, formatReceivedDate, groupLeadsByEmail, type InboxSite } from './lead-inbox-model';
import { Spokes } from '@/components/ui/spokes';
import { useFormStatus } from 'react-dom';

type InboxLead = OwnedLead;

function LeadStatusButton({ value, children, primary = false }: { value: string; children: ReactNode; primary?: boolean }) {
  const { pending, data } = useFormStatus();
  const isSubmitting = pending && data?.get('status') === value;
  return <button name="status" value={value} disabled={pending} className={`${primary ? 'bg-primary text-primary-foreground' : 'border'} inline-flex items-center gap-2 rounded-lg px-3 py-2 disabled:opacity-60`}>
    {isSubmitting && <Spokes className="size-4" aria-hidden="true" />}
    {isSubmitting ? 'Updating...' : children}
  </button>;
}

function PaymentForm({ lead }: { lead: InboxLead }) {
  const [state, action, pending] = useActionState<PaymentRequestState, FormData>(createPaymentRequestAction, {});
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copyPaymentLink() {
    if (!state.paymentUrl) return;

    try {
      await navigator.clipboard.writeText(state.paymentUrl);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  }

  if (state.paymentUrl) return <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40"><p className="font-medium">{state.delivered ? `Payment request sent to ${state.customerEmail}` : 'Payment request created, but the email could not be sent.'}</p>{state.delivered ? <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">Ask the pet owner to check Spam or Junk if it isn&apos;t in their inbox, then mark it as not spam so the payment link works.</p> : <p className="mt-1">Copy the payment link and send it manually.</p>}<button type="button" className="mt-2 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-colors hover:bg-emerald-100 disabled:cursor-default dark:hover:bg-emerald-900/50" onClick={() => void copyPaymentLink()} disabled={copyStatus === 'copied'}>{copyStatus === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copyStatus === 'copied' ? 'Copied' : 'Copy payment link'}</button><div className="mt-1 min-h-5" aria-live="polite">{copyStatus === 'copied' && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Payment link copied. Paste it anywhere.</p>}{copyStatus === 'error' && <p className="text-xs text-destructive">We couldn&apos;t copy the link. Check your browser&apos;s clipboard permission and try again.</p>}</div></div>;
  return <form action={action} className="mt-4 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"><input type="hidden" name="leadId" value={lead.id} /><label><span className="mb-1 block text-xs font-medium">Total amount</span><input name="amount" required inputMode="decimal" placeholder="240.00" className="h-10 w-full rounded-lg border border-input bg-background px-3" /></label><label><span className="mb-1 block text-xs font-medium">Service</span><input name="description" required defaultValue={lead.serviceRequested || 'Pet care'} className="h-10 w-full rounded-lg border border-input bg-background px-3" /></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-medium">Customer note (optional)</span><input name="note" className="h-10 w-full rounded-lg border border-input bg-background px-3" /></label>{state.error && <p className="text-destructive sm:col-span-2">{state.error}</p>}<button disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground sm:col-span-2">{pending && <Spokes className="size-4" aria-hidden="true" />}{pending ? 'Sending...' : 'Send payment request'}</button></form>;
}

function SaveClientForm({ leadId, savedHouseholdId, onCreateDraftBooking }: { leadId: string; savedHouseholdId?: string; onCreateDraftBooking: (leadId: string, householdId: string) => void }) {
  const [state, action, pending] = useActionState<SaveClientState, FormData>(saveClientFromLeadAction, {});
  const householdId = savedHouseholdId || state.householdId;
  if (householdId) return <div className="mt-4 flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><Check className="size-4" aria-hidden="true" />{state.success || 'Saved as a client'}</p><button type="button" onClick={() => onCreateDraftBooking(leadId, householdId)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-4 font-medium hover:bg-accent"><CalendarPlus className="size-4" aria-hidden="true" />Create draft booking</button></div>;
  return <form action={action} className="mt-4"><input type="hidden" name="leadId" value={leadId} /><button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-4 font-medium transition-colors hover:bg-accent disabled:opacity-60">{pending ? <Spokes className="size-4" aria-hidden="true" /> : <UserRoundPlus className="size-4" aria-hidden="true" />}{pending ? 'Saving...' : 'Save as client'}</button>{state.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}</form>;
}

export function LeadInbox({ sites, leads, conversationMessages, clientHouseholdByLead, onCreateDraftBooking }: { sites: InboxSite[]; leads: InboxLead[]; conversationMessages: Record<string, ConversationMessage[]>; clientHouseholdByLead: Record<string, string>; onCreateDraftBooking: (leadId: string, householdId: string) => void }) {
  const [filter, setFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const siteOptions = buildSiteFilterOptions(sites, leads);
  const visible = filter === 'all' ? leads : leads.filter((lead) => lead.subdomain === filter);
  const conversations = groupLeadsByEmail(visible);
  const unread = leads.filter((lead) => !lead.readAt).length;
  const selectedSite = siteOptions.find((site) => site.subdomain === filter);
  const filterLabel = selectedSite?.name || `All sites (${siteOptions.length})`;

  function selectSite(value: string) {
    setFilter(value);
    setFilterOpen(false);
  }

  async function copyDetails(lead: InboxLead) {
    try {
      await navigator.clipboard.writeText(`${lead.name} <${lead.email}>\n${lead.message}`);
      setCopyState(lead.id);
      window.setTimeout(() => setCopyState((current) => current === lead.id ? null : current), 1800);
    } catch {
      setCopyState(null);
    }
  }

  function toggleLead(lead: InboxLead, groupedLeads: InboxLead[] = [lead]) {
    const isOpening = expanded !== lead.id;
    setExpanded(isOpening ? lead.id : null);
    const unreadLeads = groupedLeads.filter((item) => !item.readAt);
    if (isOpening && unreadLeads.length) {
      startTransition(() => {
        const formData = new FormData();
        for (const unreadLead of unreadLeads) formData.append('leadIds', unreadLead.id);
        void markLeadGroupReadAction(formData);
      });
    }
  }

  if (!leads.length) return <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-medium">No inquiries yet</p><p className="mt-1 text-sm text-muted-foreground">Share your site link with clients to start receiving messages here.</p></div>;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{unread ? `${unread} unread` : 'All caught up'}</p>
      <div className="flex items-center gap-2 text-sm">
        <span id="site-filter-label" className="text-muted-foreground">Site</span>
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-labelledby="site-filter-label site-filter-value" aria-haspopup="listbox" aria-expanded={filterOpen} className="flex h-9 min-w-44 items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 text-left font-medium shadow-xs outline-none transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <span id="site-filter-value" className="truncate">{filterLabel}</span>
              <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${filterOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} collisionPadding={12} className="w-[var(--radix-popover-trigger-width)] min-w-52 p-1.5">
            <div role="listbox" aria-labelledby="site-filter-label" className="space-y-0.5">
              <button type="button" role="option" aria-selected={filter === 'all'} onClick={() => selectSite('all')} className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent">
                <span>All sites <span className="text-muted-foreground">({siteOptions.length})</span></span>
                <Check className={`size-4 text-emerald-600 ${filter === 'all' ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
              </button>
              {siteOptions.map((site) => <button key={site.subdomain} type="button" role="option" aria-selected={filter === site.subdomain} onClick={() => selectSite(site.subdomain)} className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"><span className="min-w-0"><span className="block truncate">{site.name}</span><span className="block text-xs text-muted-foreground">{site.inquiryCount} {site.inquiryCount === 1 ? 'inquiry' : 'inquiries'}</span></span><Check className={`size-4 shrink-0 text-emerald-600 ${filter === site.subdomain ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" /></button>)}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
    <div className="space-y-2">{conversations.map(({ email, leads: groupedLeads }) => {
      const lead = groupedLeads[0];
      const unreadInConversation = groupedLeads.some((item) => !item.readAt);
      return <article key={email} className={`overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,.04)] transition-colors ${unreadInConversation ? 'border-emerald-500/50' : 'border-border'}`}>
      <button type="button" onClick={() => toggleLead(lead, groupedLeads)} className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/25 focus-visible:bg-muted/30" aria-expanded={expanded === lead.id} aria-controls={`inquiry-${lead.id}`}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"><span className="truncate font-semibold text-foreground">{lead.name}{unreadInConversation && <span className="ml-2 inline-block size-2 rounded-full bg-emerald-500" aria-label="Unread" />}{groupedLeads.length > 1 && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{groupedLeads.length} requests</span>}</span><span className="shrink-0 text-xs text-muted-foreground">{lead.siteName} · {formatReceivedDate(lead.createdAt)}</span></span>
          <span className="mt-1 flex min-w-0 items-baseline gap-3 text-sm"><span className="shrink-0 font-medium text-foreground">{formatInquiryDateRange(lead)}</span>{lead.message && <span className="truncate text-muted-foreground">{lead.message}</span>}</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground ${expanded === lead.id ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {expanded === lead.id && <div id={`inquiry-${lead.id}`} className="border-t border-border px-4 pb-4 pt-4 text-sm sm:px-5 sm:pb-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><a href={`mailto:${lead.email}`} className="min-w-0 truncate font-medium underline underline-offset-4">{lead.email}</a><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => void copyDetails(lead)} className="underline underline-offset-4">{copyState === lead.id ? 'Copied' : 'Copy details'}</button><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{lead.status || 'NEW'}</span></div></div><dl className="mt-4 grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-[0.9fr_1.5fr_1fr_0.75fr]"><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service</dt><dd className="mt-1 font-medium">{lead.serviceRequested || 'Not specified'}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Care dates</dt><dd className="mt-1 font-medium">{formatInquiryDateRange(lead)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pets</dt><dd className="mt-1 font-medium">{lead.petCount ? `${lead.petCount} ` : ''}{lead.petTypes?.join(', ') || 'Not specified'}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ZIP code</dt><dd className="mt-1 font-medium">{lead.postalCode || 'Not provided'}</dd></div></dl><div className="mt-5 rounded-xl bg-muted/30 p-4"><ConversationMessages messages={[{ id: `lead-${lead.id}`, sender: 'CUSTOMER', body: lead.message || lead.serviceRequested || 'Availability request', createdAt: lead.createdAt }, ...(conversationMessages[lead.id] || [])]} />{canReopenLead(lead.status) ? <p className="mt-4 text-xs text-muted-foreground">This conversation is closed. Reopen it before replying.</p> : lead.id in conversationMessages ? <ConversationReplyForm participant="SITTER" leadId={lead.id} /> : <p className="mt-4 text-xs text-muted-foreground">This older request continues by email.</p>}</div>{(lead.status === 'NEW' || !lead.status) && <form action={updateLeadStatusAction} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="leadId" value={lead.id} /><LeadStatusButton value="QUALIFIED" primary>Qualify inquiry</LeadStatusButton><LeadStatusButton value="DECLINED">Decline</LeadStatusButton><LeadStatusButton value="SPAM">Spam</LeadStatusButton></form>}{canReopenLead(lead.status) && <form action={updateLeadStatusAction} className="mt-4"><input type="hidden" name="leadId" value={lead.id} /><LeadStatusButton value="NEW">Reopen conversation</LeadStatusButton></form>}{canSaveClientFromLead(lead.status) && <SaveClientForm leadId={lead.id} savedHouseholdId={clientHouseholdByLead[lead.id]} onCreateDraftBooking={onCreateDraftBooking} />}{canRequestPayment(lead.status) && <PaymentForm lead={lead} />}</div>}
    </article>;
    })}</div>
    {isPending && <p className="text-xs text-muted-foreground" role="status">Updating inbox...</p>}
  </div>;
}
