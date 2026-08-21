import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSubdomainData } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';
import { createLeadAction } from '@/app/actions';
import { ThemeToggle } from '@/components/theme-toggle';
import { MapPin, PawPrint } from 'lucide-react';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      title: rootDomain
    };
  }

  return {
    title: `${subdomain}.${rootDomain}`,
    description: subdomainData.tagline || `Pet care from ${subdomainData.businessName || subdomain}.`
  };
}

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href={`${protocol}://${rootDomain}`} className="flex items-center gap-2 text-sm font-semibold"><PawPrint className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />{subdomainData.businessName || `${subdomain}'s pet care`}</Link>
          <div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">Site by Sitterfolio</span><ThemeToggle /></div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-14 px-6 py-16 lg:grid-cols-[1fr_420px] lg:items-center lg:py-24">
        <section>
          {subdomainData.profileImageUrl ? <img src={subdomainData.profileImageUrl} alt={`${subdomainData.businessName || subdomain}'s profile`} className="mb-8 h-28 w-28 rounded-3xl object-cover shadow-lg ring-4 ring-card" /> : <div className="mb-8 grid size-28 place-items-center rounded-3xl bg-emerald-50 text-6xl dark:bg-emerald-950/50">{subdomainData.emoji}</div>}
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400"><MapPin className="size-4" aria-hidden="true" />{subdomainData.location || 'Local pet care'}</p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight sm:text-7xl">{subdomainData.businessName || `${subdomain}'s care`}</h1>
          <p className="mt-6 max-w-xl text-xl leading-8 text-muted-foreground">{subdomainData.tagline || 'Thoughtful care for the pets you love.'}</p>
          {(subdomainData.services || []).length > 0 && <div className="mt-10"><p className="mb-3 text-sm font-medium">Services</p><div className="flex flex-wrap gap-3">{(subdomainData.services || []).map((service) => <span key={service} className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">{service}</span>)}</div></div>}
        </section>
        <section className="rounded-3xl border border-border bg-card p-7 shadow-2xl shadow-black/10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Ask about availability</p>
          <h2 className="text-2xl font-semibold">Tell me about your pet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Share the basics below and I’ll follow up with you directly.</p>
          <form action={createLeadAction} className="mt-7 space-y-4">
            <input type="hidden" name="subdomain" value={subdomain} />
            <label className="block"><span className="mb-2 block text-sm font-medium">Your name</span><input name="name" required autoComplete="name" className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring/40" /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium">Email</span><input name="email" type="email" required autoComplete="email" className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring/40" /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium">Dates you need care</span><input name="dates" placeholder="For example, Sept. 12–15" className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring/40" /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium">Pet and care details</span><textarea name="message" placeholder="Tell me about your pet, routine, and what kind of care you need." rows={4} className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring/40" /></label>
            <button className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90">Send availability request</button>
          </form>
        </section>
      </main>
    </div>
  );
}
