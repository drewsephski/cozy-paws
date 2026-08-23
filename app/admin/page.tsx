import { profiles } from '@/lib/profiles';
import type { Metadata } from 'next';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getOwnerPaymentSetup, getOwnerRevenue } from '@/lib/payment-requests';
import { getOwnerConversationMessages } from '@/lib/conversations';
import { listOwnerClientHouseholds } from '@/lib/client-households';

export const metadata: Metadata = {
  title: `Sitter dashboard | ${rootDomain}`,
  description: 'Update and share your pet-sitting website.',
  robots: { index: false, follow: false }
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ stripe?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/auth?callbackURL=%2Fadmin');
  const stripeReturn = (await searchParams).stripe;

  const sites = await profiles.listOwned(session.user.id);
  const leads = await profiles.getOwnedLeadsForAllSites(session.user.id);
  const [revenue, paymentSetup, conversationMessages, clientHouseholds] = await Promise.all([getOwnerRevenue(session.user.id), getOwnerPaymentSetup(session.user.id), getOwnerConversationMessages(session.user.id), listOwnerClientHouseholds(session.user.id)]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader dashboard signedIn />
      <main><AdminDashboard sites={sites} leads={leads} conversationMessages={conversationMessages} clientHouseholds={clientHouseholds} revenue={revenue} paymentSetup={paymentSetup} stripeReturn={stripeReturn} /></main>
    </div>
  );
}
