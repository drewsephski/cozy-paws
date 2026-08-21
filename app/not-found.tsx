'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { rootDomain, protocol } from '@/lib/utils';
import { SiteHeader } from '@/components/site-header';
import { PawPrint } from 'lucide-react';

export default function NotFound() {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Extract subdomain from URL if we're on a subdomain page
    if (pathname?.startsWith('/subdomain/')) {
      const extractedSubdomain = pathname.split('/')[2];
      if (extractedSubdomain) {
        setSubdomain(extractedSubdomain);
      }
    } else {
      // Try to extract from hostname for direct subdomain access
      const hostname = window.location.hostname;
      if (hostname.includes(`.${rootDomain.split(':')[0]}`)) {
        const extractedSubdomain = hostname.split('.')[0];
        setSubdomain(extractedSubdomain);
      }
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><PawPrint aria-hidden="true" /></span>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Page not found</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {subdomain ? (
            <>
              <span>{subdomain}</span>.{rootDomain} isn’t live yet
            </>
          ) : (
            'We couldn’t find that page'
          )}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {subdomain ? 'This site address is still available. You can claim it and start building your pet-care site.' : 'The link may be outdated. Head home to create a site or open your dashboard.'}
        </p>
        <div className="mt-8">
          <Link
            href={`${protocol}://${rootDomain}`}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {subdomain ? `Claim ${subdomain}` : 'Go to Sitterfolio home'}
          </Link>
        </div>
      </main>
    </div>
  );
}
