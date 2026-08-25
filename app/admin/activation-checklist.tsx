'use client';

import { Check, CircleAlert, ExternalLink, type LucideIcon } from '@/components/ui/animated-icons';
import type { ActivationItem } from './activation-model';

const icons: Record<ActivationItem['id'], LucideIcon> = {
  'site-setup': ExternalLink,
  'share-site': ExternalLink,
  'connect-stripe': CircleAlert,
  'respond-to-inquiry': CircleAlert,
  'save-client': Check,
  'create-booking': Check
};

function ActivationAction({ item, onOpenTab }: { item: ActivationItem; onOpenTab: (tab: 'dashboard' | 'messages' | 'clients' | 'bookings') => void }) {
  const className = 'inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  if (item.destination.kind === 'tab') {
    const tab = item.destination.value;
    return <button type="button" className={className} onClick={() => onOpenTab(tab)}>{item.actionLabel}</button>;
  }
  return <a className={className} href={item.destination.href}>{item.actionLabel}</a>;
}

function ActivationItemRow({ item, onOpenTab }: { item: ActivationItem; onOpenTab: (tab: 'dashboard' | 'messages' | 'clients' | 'bookings') => void }) {
  const Icon = icons[item.id];
  return <li className="flex items-start gap-3 border-t border-border/70 py-3 first:border-t-0 first:pt-0 last:pb-0">
    <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${item.complete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
      {item.complete ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
    </span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.label}{item.complete && <span className="sr-only"> complete</span>}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.detail}</span></span>
    <span className="shrink-0"><ActivationAction item={item} onOpenTab={onOpenTab} /></span>
  </li>;
}

export function ActivationChecklist({ items, next, onOpenTab }: { items: ActivationItem[]; next: ActivationItem | null; onOpenTab: (tab: 'dashboard' | 'messages' | 'clients' | 'bookings') => void }) {
  if (!next) return null;
  return <section aria-labelledby="activation-title" className="rounded-xl bg-card p-4 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_14px_36px_-28px_rgba(0,0,0,.35)] sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CircleAlert className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-medium uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Keep moving</p><h2 id="activation-title" className="mt-1 text-lg font-semibold">Your next activation step</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{next.detail}</p></div></div>
      <ActivationAction item={next} onOpenTab={onOpenTab} />
    </div>
    <details className="mt-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <summary className="cursor-pointer list-none text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">View all activation steps <span className="ml-1 text-xs font-normal text-muted-foreground">({items.filter((item) => !item.complete && item.actionable).length} remaining)</span></summary>
      <ul className="mt-3 pb-1">{items.map((item) => <ActivationItemRow key={item.id} item={item} onOpenTab={onOpenTab} />)}</ul>
    </details>
  </section>;
}
