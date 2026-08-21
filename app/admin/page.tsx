import { getAllSubdomains } from '@/lib/subdomains';
import type { Metadata } from 'next';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';
import { getLeads } from '@/lib/subdomains';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: `Sitter dashboard | ${rootDomain}`,
  description: 'Update and share your pet-sitting website.'
};

export default async function AdminPage() {
  // TODO: You can add authentication here with your preferred auth provider
  const tenants = await getAllSubdomains();
  const leads = tenants.length ? await getLeads(tenants[0].subdomain) : [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader dashboard />
      <main><AdminDashboard tenants={tenants} leads={leads} /></main>
    </div>
  );
}
