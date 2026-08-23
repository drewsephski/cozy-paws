'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { NoiseTexture } from '@/components/ui/noise-texture';
import { LeadForm } from './lead-form';

type PublicInquiryColumnProps = {
  subdomain: string;
  sitterName: string;
  services: string[];
  submissionToken: string;
};

export function InquiryFollowup({ subdomain, sitterName, conversationToken }: { subdomain: string; sitterName: string; conversationToken?: string }) {
  const href = conversationToken
    ? `/conversation/${conversationToken}`
    : `/auth?mode=sign-up&callbackURL=${encodeURIComponent(`/message/${subdomain}`)}`;

  return <aside className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><MessageCircle className="size-4" aria-hidden="true" /></span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold">{conversationToken ? `Your messages with ${sitterName}` : 'Have a general question?'}</p>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{conversationToken ? 'Return to your private conversation anytime.' : 'Start an account-based chat without sending dates or care details.'}</p>
    </div>
    <Link href={href} className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-emerald-800 outline-none transition hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600/40 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
      {conversationToken ? 'Open messages' : 'Ask a question'}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  </aside>;
}

export function PublicInquiryColumn({ subdomain, sitterName, services, submissionToken }: PublicInquiryColumnProps) {
  const [conversationToken, setConversationToken] = useState<string>();

  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,.08),0_24px_60px_-38px_rgba(0,0,0,.45)] sm:p-6">
      <NoiseTexture className="opacity-[.035] dark:opacity-[.08]" frequency={0.55} slope={0.2} />
      <div className="relative">
        <LeadForm subdomain={subdomain} sitterName={sitterName} services={services} submissionToken={submissionToken} onConversationStarted={setConversationToken} />
      </div>
    </section>
    <InquiryFollowup subdomain={subdomain} sitterName={sitterName} conversationToken={conversationToken} />
  </div>;
}
