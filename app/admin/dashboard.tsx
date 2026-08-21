'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Globe2 } from 'lucide-react';
import Link from 'next/link';
import { deleteSubdomainAction } from '@/app/actions';
import { rootDomain, protocol } from '@/lib/utils';
import { saveProfileAction } from '@/app/actions';
import { ProfileImageUpload } from './profile-image-upload';
import { ShareSiteButton } from './share-site-button';
import { DeleteSiteDialog } from './delete-site-dialog';

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
    <div className="border-b border-border pb-7">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Sitter dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">Your pet-care website</h1>
        <p className="mt-2 text-sm text-muted-foreground">Update what pet owners see, share your site, and review new inquiries.</p>
      </div>
    </div>
  );
}

function ProfileField({ label, name, defaultValue, placeholder, type = 'text', hint, className }: { label: string; name: string; defaultValue: string; placeholder: string; type?: string; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/30" />
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProfileEditor({ tenant }: { tenant: Tenant }) {
  return (
    <section className="space-y-3">
      <div><h2 className="text-xl font-semibold">Edit what pet owners see</h2><p className="mt-1 text-sm text-muted-foreground">Keep the essentials current. Changes appear after you save.</p></div>
      <form action={saveProfileAction} className="rounded-xl border border-border bg-card shadow-sm">
        <input type="hidden" name="subdomain" value={tenant.subdomain} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileField label="Business name" name="businessName" defaultValue={tenant.businessName || ''} placeholder="Happy Tails Pet Care" className="lg:col-span-2" />
          <ProfileField label="One-sentence introduction" name="tagline" defaultValue={tenant.tagline || ''} placeholder="Reliable care for pets nearby." className="lg:col-span-2" />
          <ProfileField label="Area you serve" name="location" defaultValue={tenant.location || ''} placeholder="Oak Park and nearby" className="lg:col-span-2" />
          <ProfileField label="Services you offer" name="services" defaultValue={(tenant.services || []).join(', ')} placeholder="Dog walking, Drop-ins, Overnight stays" hint="Separate services with commas." className="lg:col-span-2" />
          <ProfileField label="Phone" name="phone" type="tel" defaultValue={tenant.phone || ''} placeholder="(555) 123-4567" />
          <ProfileField label="Email" name="email" type="email" defaultValue={tenant.email || ''} placeholder="hello@example.com" />
          <div className="sm:col-span-2 lg:col-span-2">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Profile photo</p>
            <ProfileImageUpload subdomain={tenant.subdomain} currentImageUrl={tenant.profileImageUrl} />
          </div>
        </div>
        <div className="flex items-center justify-end border-t border-border bg-muted/20 px-5 py-3">
          <Button type="submit" size="sm">Save changes</Button>
        </div>
      </form>
    </section>
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
        <CardContent className="py-12 text-center">
          <Globe2 className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">You haven’t created a site yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Choose a web address on the home page to get started.</p>
          <Button asChild className="mt-5"><Link href="/">Create my site</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tenants.map((tenant) => (
        <Card key={tenant.subdomain} className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div><p className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Live site</p><CardTitle className="text-xl">{tenant.businessName || tenant.subdomain}</CardTitle></div>
              <DeleteSiteDialog
                subdomain={tenant.subdomain}
                siteUrl={`${tenant.subdomain}.${rootDomain}`}
                action={action}
                isPending={isPending}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-muted text-3xl">{tenant.emoji}</div>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{tenant.subdomain}.{rootDomain}</p><p className="text-xs text-muted-foreground">Created {new Date(tenant.createdAt).toLocaleDateString()}</p></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`${protocol}://${tenant.subdomain}.${rootDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                View site <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
              <ShareSiteButton url={`${protocol}://${tenant.subdomain}.${rootDomain}`} name={tenant.businessName || tenant.subdomain} />
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
      <section className="space-y-4"><div><h2 className="text-xl font-semibold">Share your site</h2><p className="mt-1 text-sm text-muted-foreground">Preview each live site or copy its link to send to a pet owner.</p></div><TenantGrid tenants={tenants} action={action} isPending={isPending} /></section>
      {tenants[0] && <ProfileEditor tenant={tenants[0]} />}
      <section className="space-y-4"><div><h2 className="text-xl font-semibold">Recent inquiries</h2><p className="mt-1 text-sm text-muted-foreground">Messages pet owners sent through your public site.</p></div>{leads.length > 0 ? <div className="grid gap-3 lg:grid-cols-2">{leads.slice(0, 6).map((lead, index) => <div key={`${lead.email}-${index}`} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><strong>{lead.name}</strong><a href={`mailto:${lead.email}`} className="text-sm text-muted-foreground hover:text-foreground">{lead.email}</a></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{lead.dates || 'Dates not provided'}{lead.message ? ` — ${lead.message}` : ''}</p></div>)}</div> : <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-medium">No inquiries yet</p><p className="mt-1 text-sm text-muted-foreground">Share your site link with clients to start receiving messages here.</p></div>}</section>

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
