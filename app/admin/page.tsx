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
import { listOwnerBookings } from '@/lib/bookings';
import { isRoverImportPrepareAvailable } from '@/lib/profile-import/config';

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
  const leads = await profiles.getOwnedLeadsForSites(session.user.id, sites);
  const today = new Date();
  const bookingStart = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate())).toISOString().slice(0, 10);
  const bookingEnd = new Date(Date.UTC(today.getUTCFullYear() + 2, today.getUTCMonth(), today.getUTCDate())).toISOString().slice(0, 10);
  const [revenue, paymentSetup, conversationMessages, clientHouseholds, bookings] = await Promise.all([getOwnerRevenue(session.user.id), getOwnerPaymentSetup(session.user.id), getOwnerConversationMessages(session.user.id, 500), listOwnerClientHouseholds(session.user.id, 100), listOwnerBookings(session.user.id, { startDate: bookingStart, endDate: bookingEnd })]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader dashboard signedIn />
      <main><AdminDashboard sites={sites} leads={leads} conversationMessages={conversationMessages} clientHouseholds={clientHouseholds} bookings={bookings} revenue={revenue} paymentSetup={paymentSetup} stripeReturn={stripeReturn} roverImportEnabled={isRoverImportPrepareAvailable()} /></main>
    </div>
  );
}
