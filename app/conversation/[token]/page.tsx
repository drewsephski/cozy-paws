import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { getCustomerConversation } from '@/lib/conversations';
import { ConversationMessages, ConversationReplyForm } from '@/components/conversation-thread';
import { rootDomain } from '@/lib/utils';

export const metadata: Metadata = {
  title: `Private conversation | ${rootDomain}`,
  robots: { index: false, follow: false },
  referrer: 'no-referrer'
};

export default async function CustomerConversationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const conversation = await getCustomerConversation(token);
  if (!conversation) notFound();

  const dates = [conversation.requestedStartDate, conversation.requestedEndDate].filter(Boolean).join(' to ');

  return <main className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-2xl">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><MessageCircle className="size-5" aria-hidden="true" /></span><div><p className="font-semibold">{conversation.businessName}</p><p className="text-xs text-muted-foreground">Private conversation</p></div></div>
        <Link href={`/s/${conversation.subdomain}`} className="text-sm font-medium underline underline-offset-4">View site</Link>
      </header>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="border-b border-border pb-5"><h1 className="text-2xl font-semibold tracking-tight">Your request to {conversation.sitterName}</h1><p className="mt-2 text-sm text-muted-foreground">{conversation.serviceRequested || 'Pet care'}{dates ? ` · ${dates}` : ''}</p></div>
        <div className="mt-6"><ConversationMessages messages={conversation.messages} /></div>
        <ConversationReplyForm participant="CUSTOMER" conversationToken={token} />
        <p className="mt-4 text-xs leading-5 text-muted-foreground">We&apos;ll email you when {conversation.sitterName} replies. Keep this private link to return without an account.</p>
      </section>
    </div>
  </main>;
}
