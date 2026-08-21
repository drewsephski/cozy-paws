import { SubdomainForm } from './subdomain-form';
import { PawPrint } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function HomePage() {
  const session = await getSession();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-16 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
        <section>
          <p className="mb-6 flex items-center text-sm font-medium text-muted-foreground"><PawPrint aria-hidden="true" className="mr-2 size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />Your pet-care business, easy to share</p>
          <h1 className="max-w-xl text-5xl font-bold tracking-[-.055em] sm:text-6xl lg:text-7xl">Give pet owners one clear place to meet you.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Create a polished site with your services, photo, and contact form—then send your link anywhere you talk with clients.</p>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span>✓ Your own web address</span><span>✓ No design work</span><span>✓ Inquiries in one place</span>
          </div>
        </section>

        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,.28)] sm:p-8 md:max-w-2xl md:justify-self-center lg:max-w-none">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div><p className="text-sm font-medium text-muted-foreground">Start here</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Choose your site address</h2></div>
            <div className="grid size-8 place-items-center rounded-full border border-border bg-muted/40 text-emerald-700 dark:text-emerald-400"><PawPrint aria-hidden="true" className="size-4" /></div>
          </div>
          {session ? <SubdomainForm /> : (
            <div>
              <Button asChild className="w-full"><Link href="/auth?callbackURL=%2F">Sign in to create your site</Link></Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">Your account keeps your profile and inquiries private.</p>
            </div>
          )}
          <p className="mt-5 text-center text-xs text-muted-foreground">Next, you’ll add your business details and photo.</p>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-border/70 px-5 py-6 text-xs text-muted-foreground lg:px-8">
        <span>Built for independent pet sitters.</span><span>© {new Date().getFullYear()} Sitterfolio</span>
      </footer>
    </div>
  );
}
