import { getAllSubdomains } from '@/lib/subdomains';
import type { Metadata } from 'next';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';
import { getLeads } from '@/lib/subdomains';

export const metadata: Metadata = {
  title: `Admin Dashboard | ${rootDomain}`,
  description: `Manage subdomains for ${rootDomain}`
};

export default async function AdminPage() {
  // TODO: You can add authentication here with your preferred auth provider
  const tenants = await getAllSubdomains();
  const leads = tenants.length ? await getLeads(tenants[0].subdomain) : [];

  return (
      <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <AdminDashboard tenants={tenants} leads={leads} />
    </div>
  );
}
