import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profiles } from '@/lib/profiles';
import { protocol, rootDomain } from '@/lib/utils';
import { LeadForm } from './lead-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import { PetIcon } from '@/components/pet-icon';
import { AboutSitterfolioDialog } from '@/components/about-sitterfolio-dialog';
import { PublicPaymentSection } from './public-payment-section';
import { getPublicPaymentAvailability } from '@/lib/public-payments';
import { NoiseTexture } from '@/components/ui/noise-texture';

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
    title: `${subdomainData.businessName || subdomainData.sitterName || subdomain} | Pet care in ${subdomainData.location || 'your area'}`,
    description: subdomainData.tagline || `View pet-care services and ask ${subdomainData.sitterName || subdomainData.businessName || subdomain} about availability.`,
    alternates: { canonical: `${protocol}://${subdomain}.${rootDomain}` },
    openGraph: {
      title: subdomainData.businessName || subdomainData.sitterName || `${subdomain}'s pet care`,
      description: subdomainData.tagline || `Pet care in ${subdomainData.location || 'your area'}.`,
      url: `${protocol}://${subdomain}.${rootDomain}`,
      type: 'website',
      images: subdomainData.profileImageUrl ? [{ url: subdomainData.profileImageUrl, alt: `${subdomainData.sitterName || subdomainData.businessName || subdomain} pet sitter` }] : undefined
    }
  };
}

export default async function SubdomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { subdomain } = await params;
  const paymentError = (await searchParams).payment === 'unavailable';
  const subdomainData = await profiles.get(subdomain);

  if (!subdomainData) {
    notFound();
  }
  const sitterDisplayName = subdomainData.sitterName || subdomainData.businessName || `${subdomain}'s care`;
  const publicPaymentsEnabled = await getPublicPaymentAvailability(subdomain);
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness',
    name: subdomainData.businessName || subdomainData.sitterName || `${subdomain}'s pet care`,
    description: subdomainData.tagline || undefined,
    url: `${protocol}://${subdomain}.${rootDomain}`,
    image: subdomainData.profileImageUrl || undefined,
    areaServed: subdomainData.location || undefined,
    knowsAbout: subdomainData.services?.length ? subdomainData.services : undefined
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <AboutSitterfolioDialog businessName={subdomainData.businessName || subdomainData.sitterName || `${subdomain}'s pet care`} />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 py-14 lg:grid-cols-[1fr_390px] lg:items-center lg:py-20">
        <section>
          {subdomainData.profileImageUrl ? <img src={subdomainData.profileImageUrl} alt={`${subdomainData.sitterName || subdomainData.businessName || subdomain}'s profile`} className="mb-8 h-28 w-28 rounded-3xl object-cover shadow-lg ring-4 ring-card" /> : <div className="relative mb-8 grid size-28 place-items-center overflow-hidden rounded-3xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"><NoiseTexture className="opacity-15 dark:opacity-20" frequency={0.65} octaves={5} /><PetIcon value={subdomainData.emoji} className="relative size-14" fallbackClassName="text-6xl" /></div>}
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400"><MapPin className="size-4" aria-hidden="true" />{subdomainData.location || 'Local pet care'}</p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight sm:text-7xl">{sitterDisplayName}</h1>
          {subdomainData.sitterName && subdomainData.businessName && <p className="mt-3 text-lg font-medium text-emerald-700 dark:text-emerald-400">{subdomainData.businessName}</p>}
          <p className="mt-6 max-w-xl text-xl leading-8 text-muted-foreground">{subdomainData.tagline || 'Pet care from someone local.'}</p>
          {(subdomainData.services || []).length > 0 && <div className="mt-10"><p className="mb-3 text-sm font-medium">Services</p><div className="flex flex-wrap gap-3">{(subdomainData.services || []).map((service) => <span key={service} className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">{service}</span>)}</div></div>}
          <PublicPaymentSection subdomain={subdomain} enabled={publicPaymentsEnabled} error={paymentError} />
        </section>
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-xl bg-card p-4 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_18px_50px_-36px_rgba(0,0,0,.4)] sm:p-5">
            <NoiseTexture className="opacity-[.035] dark:opacity-[.08]" frequency={0.55} slope={0.2} />
            <div className="relative">
              <LeadForm subdomain={subdomain} sitterName={sitterDisplayName} />
            </div>
          </section>
          <aside className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"><MessageCircle className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><p className="font-semibold">Rather chat with {sitterDisplayName} directly?</p><p className="mt-0.5 text-sm leading-5 text-muted-foreground">Create an account to message in Sitterfolio.</p></div>
            <Link href={`/auth?mode=sign-up&callbackURL=${encodeURIComponent(`/message/${subdomain}`)}`} className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-emerald-800 outline-none transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50">Start chat <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
          </aside>
        </div>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-5 text-xs text-muted-foreground sm:justify-end">
          <Link href={`${protocol}://${rootDomain}`} className="rounded-sm underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">Site by Sitterfolio</Link>
        </div>
      </footer>
    </div>
  );
}
