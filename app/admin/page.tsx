import { profiles } from '@/lib/profiles';
import type { Metadata } from 'next';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: `Sitter dashboard | ${rootDomain}`,
  description: 'Update and share your pet-sitting website.'
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/auth?callbackURL=%2Fadmin');

  const tenants = await profiles.listOwned(session.user.id);
  const leads = tenants.length
    ? await profiles.getOwnedLeads(session.user.id, tenants[0].subdomain)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader dashboard signedIn />
      <main><AdminDashboard tenants={tenants} leads={leads} /></main>
    </div>
  );
}
