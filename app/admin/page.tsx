import { profiles } from '@/lib/profiles';
import type { Metadata } from 'next';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getOwnerPaymentSetup, getOwnerRevenue } from '@/lib/payment-requests';

export const metadata: Metadata = {
  title: `Sitter dashboard | ${rootDomain}`,
  description: 'Update and share your pet-sitting website.'
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/auth?callbackURL=%2Fadmin');

  const sites = await profiles.listOwned(session.user.id);
  const leads = await profiles.getOwnedLeadsForAllSites(session.user.id);
  const [revenue, paymentSetup] = await Promise.all([getOwnerRevenue(session.user.id), getOwnerPaymentSetup(session.user.id)]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader dashboard signedIn />
      <main><AdminDashboard sites={sites} leads={leads} revenue={revenue} paymentSetup={paymentSetup} /></main>
    </div>
  );
}
