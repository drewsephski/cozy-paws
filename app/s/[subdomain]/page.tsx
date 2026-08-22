import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profiles } from '@/lib/profiles';
import { protocol, rootDomain } from '@/lib/utils';
import { LeadForm } from './lead-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { MapPin } from 'lucide-react';
import { PetIcon } from '@/components/pet-icon';
import { AboutSitterfolioDialog } from '@/components/about-sitterfolio-dialog';
import { PublicPaymentSection } from './public-payment-section';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await profiles.get(subdomain);

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
  const subdomainData = await profiles.get(subdomain);

  if (!subdomainData) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <AboutSitterfolioDialog businessName={subdomainData.businessName || `${subdomain}'s pet care`} />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 py-14 lg:grid-cols-[1fr_390px] lg:items-center lg:py-20">
        <section>
          {subdomainData.profileImageUrl ? <img src={subdomainData.profileImageUrl} alt={`${subdomainData.businessName || subdomain}'s profile`} className="mb-8 h-28 w-28 rounded-3xl object-cover shadow-lg ring-4 ring-card" /> : <div className="mb-8 grid size-28 place-items-center rounded-3xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"><PetIcon value={subdomainData.emoji} className="size-14" fallbackClassName="text-6xl" /></div>}
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400"><MapPin className="size-4" aria-hidden="true" />{subdomainData.location || 'Local pet care'}</p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight sm:text-7xl">{subdomainData.businessName || `${subdomain}'s care`}</h1>
          <p className="mt-6 max-w-xl text-xl leading-8 text-muted-foreground">{subdomainData.tagline || 'Pet care from someone local.'}</p>
          {(subdomainData.services || []).length > 0 && <div className="mt-10"><p className="mb-3 text-sm font-medium">Services</p><div className="flex flex-wrap gap-3">{(subdomainData.services || []).map((service) => <span key={service} className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">{service}</span>)}</div></div>}
          <PublicPaymentSection paymentLinkUrl={subdomainData.paymentLinkUrl} />
        </section>
        <section className="rounded-2xl border border-border bg-card p-4 shadow-xl shadow-black/10 sm:p-5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Ask about availability</p>
          <h2 className="text-xl font-semibold">Tell me about your pet</h2>
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">Send your dates and care details. I&apos;ll reply by email.</p>
          <LeadForm subdomain={subdomain} />
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-5 text-xs text-muted-foreground sm:justify-end">
          <Link href={`${protocol}://${rootDomain}`} className="rounded-sm underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">Site by Sitterfolio</Link>
        </div>
      </footer>
    </div>
  );
}
