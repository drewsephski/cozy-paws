'use client';

import { useState, useTransition } from 'react';
import { createPaymentRequestAction, markLeadReadAction, updateLeadStatusAction, type PaymentRequestState } from '@/app/actions';
import { useActionState } from 'react';
import type { OwnedLead } from '@/lib/profile-ownership';
import { canRequestPayment } from '@/lib/domain/leads';

type InboxLead = OwnedLead;

function PaymentForm({ lead }: { lead: InboxLead }) {
  const [state, action, pending] = useActionState<PaymentRequestState, FormData>(createPaymentRequestAction, {});
  if (state.paymentUrl) return <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40"><p className="font-medium">{state.delivered ? `Payment request sent to ${state.customerEmail}` : 'Payment request created, but the email could not be sent.'}</p>{!state.delivered && <p className="mt-1">Copy the payment link and send it manually.</p>}<button type="button" className="mt-2 rounded-md border px-3 py-1.5 font-medium" onClick={() => void navigator.clipboard.writeText(state.paymentUrl!)}>Copy payment link</button></div>;
  return <form action={action} className="mt-4 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"><input type="hidden" name="leadId" value={lead.id} /><label><span className="mb-1 block text-xs font-medium">Total amount</span><input name="amount" required inputMode="decimal" placeholder="240.00" className="h-10 w-full rounded-lg border border-input bg-background px-3" /></label><label><span className="mb-1 block text-xs font-medium">Service</span><input name="description" required defaultValue={lead.serviceRequested || 'Pet care'} className="h-10 w-full rounded-lg border border-input bg-background px-3" /></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-medium">Customer note (optional)</span><input name="note" className="h-10 w-full rounded-lg border border-input bg-background px-3" /></label>{state.error && <p className="text-destructive sm:col-span-2">{state.error}</p>}<button disabled={pending} className="h-10 rounded-lg bg-primary px-4 font-medium text-primary-foreground sm:col-span-2">{pending ? 'Sending…' : 'Send payment request'}</button></form>;
}

export function LeadInbox({ leads }: { leads: InboxLead[] }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sites = [...new Map(leads.map((lead) => [lead.subdomain, lead.siteName])).entries()];
  const visible = filter === 'all' ? leads : leads.filter((lead) => lead.subdomain === filter);
  const unread = leads.filter((lead) => !lead.readAt).length;
  const unreadBySite = new Map(sites.map(([subdomain]) => [subdomain, leads.filter((lead) => lead.subdomain === subdomain && !lead.readAt).length]));

  async function copyDetails(lead: InboxLead) {
    try {
      await navigator.clipboard.writeText(`${lead.name} <${lead.email}>\n${lead.message}`);
      setCopyState(lead.id);
      window.setTimeout(() => setCopyState((current) => current === lead.id ? null : current), 1800);
    } catch {
      setCopyState(null);
    }
  }

  function openLead(lead: InboxLead) {
    setExpanded(lead.id);
    if (!lead.readAt) {
      const formData = new FormData();
      formData.set('subdomain', lead.subdomain);
      formData.set('leadId', lead.id);
      startTransition(() => { void markLeadReadAction(formData); });
    }
  }

  if (!leads.length) return <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-medium">No inquiries yet</p><p className="mt-1 text-sm text-muted-foreground">Share your site link with clients to start receiving messages here.</p></div>;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{unread ? `${unread} unread` : 'All caught up'}</p>
      <label className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Site</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3"><option value="all">All Sites ({unread})</option>{sites.map(([subdomain, name]) => <option key={subdomain} value={subdomain}>{name} ({unreadBySite.get(subdomain) || 0})</option>)}</select></label>
    </div>
    <div className="space-y-2">{visible.map((lead) => <article key={lead.id} className={`rounded-2xl border bg-card p-4 shadow-sm ${lead.readAt ? 'border-border' : 'border-emerald-500/50'}`}>
      <button type="button" onClick={() => openLead(lead)} className="w-full text-left" aria-expanded={expanded === lead.id}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold">{lead.name}{!lead.readAt && <span className="ml-2 inline-block size-2 rounded-full bg-emerald-500" aria-label="Unread" />}</span><span className="text-xs text-muted-foreground">{lead.siteName} · {new Date(lead.createdAt).toLocaleDateString()}</span></div>
        <p className="mt-2 truncate text-sm text-muted-foreground">{lead.dates || 'Dates not provided'}{lead.message ? `: ${lead.message}` : ''}</p>
      </button>
      {expanded === lead.id && <div className="mt-4 border-t border-border pt-4 text-sm"><div className="flex flex-wrap gap-3"><a href={`mailto:${lead.email}`} className="font-medium underline underline-offset-4">Email {lead.email}</a><button type="button" onClick={() => void copyDetails(lead)} className="underline underline-offset-4">{copyState === lead.id ? 'Copied' : 'Copy details'}</button><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{lead.status || 'NEW'}</span></div><p className="mt-3 text-muted-foreground">{lead.serviceRequested || 'Service not specified'} · {[lead.requestedStartDate, lead.requestedEndDate].filter(Boolean).join(' to ') || lead.dates || 'Dates not provided'} · {lead.petCount ? `${lead.petCount} ` : ''}{lead.petTypes?.join(', ') || 'Pets not specified'}{lead.postalCode ? ` · ${lead.postalCode}` : ''}</p><p className="mt-3 whitespace-pre-wrap leading-6 text-muted-foreground">{lead.message || 'No care details provided.'}</p>{(lead.status === 'NEW' || !lead.status) && <form action={updateLeadStatusAction} className="mt-4 flex gap-2"><input type="hidden" name="leadId" value={lead.id} /><button name="status" value="QUALIFIED" className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">Qualify inquiry</button><button name="status" value="DECLINED" className="rounded-lg border px-3 py-2">Decline</button><button name="status" value="SPAM" className="rounded-lg border px-3 py-2">Spam</button></form>}{canRequestPayment(lead.status) && <PaymentForm lead={lead} />}</div>}
    </article>)}</div>
    {isPending && <p className="text-xs text-muted-foreground" role="status">Updating inbox...</p>}
  </div>;
}
