'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteSubdomainAction } from '@/app/actions';
import { rootDomain, protocol } from '@/lib/utils';
import { saveProfileAction } from '@/app/actions';
import { ProfileImageUpload } from './profile-image-upload';

type Tenant = {
  subdomain: string;
  emoji: string;
  createdAt: number;
  businessName?: string;
  tagline?: string;
  location?: string;
  services?: string[];
  phone?: string;
  email?: string;
  profileImageUrl?: string;
};

type DeleteState = {
  error?: string;
  success?: string;
};

function DashboardHeader() {
  // TODO: You can add authentication here with your preferred auth provider

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">Workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight">Your business pages</h1>
        <p className="mt-2 text-sm text-muted-foreground">Keep your sitter profile fresh and respond to new families.</p>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href={`${protocol}://${rootDomain}`}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {rootDomain}
        </Link>
      </div>
    </div>
  );
}

function TenantGrid({
  tenants,
  action,
  isPending
}: {
  tenants: Tenant[];
  action: (formData: FormData) => void;
  isPending: boolean;
}) {
  if (tenants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No subdomains have been created yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tenants.map((tenant) => (
        <Card key={tenant.subdomain}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{tenant.subdomain}</CardTitle>
              <form action={action}>
                <input
                  type="hidden"
                  name="subdomain"
                  value={tenant.subdomain}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="submit"
                  disabled={isPending}
                className="text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-4xl">{tenant.emoji}</div>
              <div className="text-sm text-gray-500">
                Created: {new Date(tenant.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-4">
              <a
                href={`${protocol}://${tenant.subdomain}.${rootDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Visit subdomain →
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminDashboard({ tenants, leads }: { tenants: Tenant[]; leads: { name: string; email: string; dates: string; message: string; createdAt: number }[] }) {
  const [state, action, isPending] = useActionState<DeleteState, FormData>(
    deleteSubdomainAction,
    {}
  );

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-12">
      <DashboardHeader />
      {tenants[0] && <section className="space-y-4"><div><h2 className="text-xl font-semibold">Profile editor</h2><p className="mt-1 text-sm text-muted-foreground">This is what families see when they visit your page.</p></div><form action={saveProfileAction} className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"><input type="hidden" name="subdomain" value={tenants[0].subdomain} /><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="space-y-5"><div><label className="mb-2 block text-sm font-medium">Business name</label><input name="businessName" defaultValue={tenants[0].businessName || ''} placeholder="Happy Tails Care" className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-ring/30" /></div><div><label className="mb-2 block text-sm font-medium">Short introduction</label><input name="tagline" defaultValue={tenants[0].tagline || ''} placeholder="Kind, reliable care for your favorite family members." className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-ring/30" /></div><div><label className="mb-2 block text-sm font-medium">Service area</label><input name="location" defaultValue={tenants[0].location || ''} placeholder="Your neighborhood" className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-ring/30" /></div><div><label className="mb-2 block text-sm font-medium">Services</label><input name="services" defaultValue={(tenants[0].services || []).join(', ')} placeholder="Dog walking, Drop-in visits, Overnight stays" className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-ring/30" /><p className="mt-2 text-xs text-muted-foreground">Separate services with commas.</p></div><div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium">Phone</label><input name="phone" defaultValue={tenants[0].phone || ''} placeholder="(555) 123-4567" className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-ring/30" /></div><div><label className="mb-2 block text-sm font-medium">Email</label><input name="email" defaultValue={tenants[0].email || ''} placeholder="hello@example.com" className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-ring/30" /></div></div><Button type="submit" className="h-10 rounded-lg px-5">Save changes</Button></div><div className="border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><h3 className="mb-4 font-medium">Profile photo</h3><ProfileImageUpload subdomain={tenants[0].subdomain} currentImageUrl={tenants[0].profileImageUrl} /></div></div></form></section>}
      {leads.length > 0 && <section className="space-y-4"><div><h2 className="text-xl font-semibold text-[#27332c]">Recent inquiries</h2><p className="mt-1 text-sm text-[#6d7b71]">New families who reached out through your page.</p></div><div className="grid gap-3 lg:grid-cols-2">{leads.slice(0, 6).map((lead, index) => <div key={`${lead.email}-${index}`} className="rounded-2xl border border-[#dfe6de] bg-white p-5 shadow-sm"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><strong className="text-[#27332c]">{lead.name}</strong><span className="text-sm text-[#6d7b71]">{lead.email}</span></div><p className="mt-3 text-sm leading-6 text-[#617066]">{lead.dates || 'Dates not specified'}{lead.message ? ` — ${lead.message}` : ''}</p></div>)}</div></section>}
      <section className="space-y-4"><div><h2 className="text-xl font-semibold text-[#27332c]">Your pages</h2><p className="mt-1 text-sm text-[#6d7b71]">Manage the live subdomains connected to this workspace.</p></div><TenantGrid tenants={tenants} action={action} isPending={isPending} /></section>

      {state.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          {state.success}
        </div>
      )}
    </div>
  );
}
