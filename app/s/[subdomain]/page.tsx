import type { Metadata } from 'next';
import { randomBytes } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profiles } from '@/lib/profiles';
import { protocol, rootDomain } from '@/lib/utils';
import { LeadForm } from './lead-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { Check, MapPin } from 'lucide-react';
import { PetIcon } from '@/components/pet-icon';
import { AboutSitterfolioDialog } from '@/components/about-sitterfolio-dialog';
import { PublicPaymentSection } from './public-payment-section';
import { getPublicPaymentAvailability } from '@/lib/public-payments';
import { NoiseTexture } from '@/components/ui/noise-texture';
import { normalizeServices } from '@/lib/profile-ownership';
import { PublicInquiryColumn } from './public-inquiry-column';

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
  const businessDisplayName = subdomainData.businessName || subdomainData.sitterName || `${subdomain}'s pet care`;
  const services = normalizeServices(subdomainData.services || []);
  const publicPaymentsEnabled = await getPublicPaymentAvailability(subdomain);
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness',
    name: businessDisplayName,
    description: subdomainData.tagline || undefined,
    url: `${protocol}://${subdomain}.${rootDomain}`,
    image: subdomainData.profileImageUrl || undefined,
    areaServed: subdomainData.location || undefined,
    knowsAbout: services.length ? services : undefined
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

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-5 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-16 lg:py-20">
        <section className="min-w-0 lg:sticky lg:top-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {subdomainData.profileImageUrl ? <img src={subdomainData.profileImageUrl} alt={`${sitterDisplayName}, pet sitter at ${businessDisplayName}`} className="size-32 shrink-0 rounded-3xl object-cover shadow-[0_12px_36px_-18px_rgba(0,0,0,.45)] sm:size-40" /> : <div className="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-3xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"><NoiseTexture className="opacity-15 dark:opacity-20" frequency={0.65} octaves={5} /><PetIcon value={subdomainData.emoji} className="relative size-14" fallbackClassName="text-6xl" /></div>}
            <div className="min-w-0">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-[-.03em] text-balance sm:text-5xl">{businessDisplayName}</h1>
              {subdomainData.sitterName && subdomainData.businessName && <p className="mt-2 text-base font-medium text-emerald-700 dark:text-emerald-300">Pet care by {subdomainData.sitterName}</p>}
              <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><MapPin className="mt-1 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />{subdomainData.location || 'Serving local pet families'}</p>
            </div>
          </div>
          <p className="mt-8 max-w-2xl text-xl leading-8 text-foreground/85">{subdomainData.tagline || `${sitterDisplayName} offers thoughtful, one-to-one pet care in the local community.`}</p>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Check className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />Direct contact with {sitterDisplayName}</span>
            <span className="inline-flex items-center gap-2"><Check className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />Private inquiry and email replies</span>
          </div>
          <div className="mt-9">
            <h2 className="text-lg font-semibold">Care offered</h2>
            {services.length > 0 ? <div className="mt-4 flex flex-wrap gap-2.5">{services.map((service) => <span key={service} className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">{service}</span>)}</div> : <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Ask about the care your pet needs. {sitterDisplayName} can confirm services and availability directly.</p>}
          </div>
          <PublicPaymentSection subdomain={subdomain} enabled={publicPaymentsEnabled} error={paymentError} />
        </section>
        <PublicInquiryColumn subdomain={subdomain} sitterName={sitterDisplayName} services={services} submissionToken={randomBytes(24).toString('base64url')} />
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-5 text-xs text-muted-foreground sm:justify-end">
          <Link href={`${protocol}://${rootDomain}`} className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">Site by Sitterfolio</Link>
        </div>
      </footer>
    </div>
  );
}
