import { HeroStartButton, SubdomainForm } from './subdomain-form';
import Link from 'next/link';
import { ArrowRight, Check, Inbox, MapPin, PawPrint } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';

export const metadata = {
  title: 'Website for Pet Sitters',
  description:
    'Create a pet-sitting site with your services, service area, and an availability request form.'
};

export default async function HomePage() {
  const session = await getSession();
  const signedIn = Boolean(session);
  return (
    <div className="landing-shell min-h-screen">
      <SiteHeader floating signedIn={signedIn} />

      <main>
        <section className="relative overflow-hidden border-b landing-rule">
          <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid min-h-[calc(100svh-1rem)] w-full max-w-6xl min-w-0 items-center gap-12 px-5 pb-16 pt-28 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:px-8 lg:pb-24 lg:pt-32">
            <div className="min-w-0">
              <p className="mb-6 flex items-center text-sm font-medium landing-muted"><PawPrint aria-hidden="true" className="mr-2 size-4 landing-accent" strokeWidth={2.25} />One link for your pet-care business</p>
              <h1 className="max-w-xl text-5xl font-bold tracking-[-.04em] sm:text-6xl lg:text-7xl">Give pet owners a place to find you again.</h1>
              <p className="mt-6 max-w-lg text-lg leading-8 landing-muted">Put your services, photo, and availability form on one page. Share the link wherever you already talk with clients.</p>
              <div className="mt-8">
                {signedIn ? <Link href="/admin" className="landing-cta">Open dashboard<ArrowRight aria-hidden="true" className="size-4" /></Link> : <HeroStartButton />}
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm landing-muted">
                <span className="flex items-center gap-2"><Check aria-hidden="true" className="size-4 landing-accent" />Your own web address</span>
                <span className="flex items-center gap-2"><Check aria-hidden="true" className="size-4 landing-accent" />No site design needed</span>
                <span className="flex items-center gap-2"><Check aria-hidden="true" className="size-4 landing-accent" />Inquiries in one inbox</span>
              </div>
            </div>

            <section id="site-address" className="landing-panel w-full scroll-mt-24 border p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,.28)] sm:p-8 md:max-w-2xl md:justify-self-center lg:max-w-none">
              <div className="mb-8 flex items-start justify-between gap-4"><div><p className="text-sm font-medium landing-muted">Start here</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Choose your site address</h2></div><div className="landing-accent-soft grid size-9 place-items-center rounded-lg landing-accent"><PawPrint aria-hidden="true" className="size-4" /></div></div>
              <SubdomainForm />
              <p className="mt-5 text-center text-xs landing-muted">Build the draft first. Create an account when you publish.</p>
            </section>
          </div>
        </section>

        <section className="border-b landing-rule">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:px-8 lg:py-28">
            <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
              <h2 className="landing-section-title max-w-[11ch] font-semibold">Everything clients need to come back.</h2>
              <p className="mt-6 max-w-md leading-7 landing-muted">Sitterfolio turns your pet-care details into a clear, useful destination—without asking you to become a web designer.</p>
            </div>
            <div className="divide-y landing-rule border-y landing-rule">
              {[
                [PawPrint, 'Show what makes your care yours', 'Add your photo, services, and the details returning clients actually need.'],
                [MapPin, 'Share one reliable address', 'Use the same link in follow-ups, email signatures, social profiles, or business cards.'],
                [Inbox, 'Keep every request together', 'Clients send dates and care details into one sitter dashboard instead of an old message thread.']
              ].map(([Icon, title, body]) => (
                <article key={String(title)} className="grid gap-5 py-8 sm:grid-cols-[3rem_minmax(0,1fr)] sm:py-10">
                  <div className="landing-accent-soft grid size-11 place-items-center rounded-lg landing-accent"><Icon aria-hidden="true" className="size-5" /></div>
                  <div><h3 className="text-xl font-semibold tracking-[-.02em]">{String(title)}</h3><p className="mt-2 max-w-xl leading-7 landing-muted">{String(body)}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="mx-auto grid min-h-[28rem] w-full max-w-6xl grid-rows-[auto_1fr_auto] gap-10 px-5 py-16 lg:px-8 lg:py-20">
        <p className="landing-section-title max-w-[18ch] font-semibold">Make the next booking easier to begin.</p>
        <div className="row-start-3 flex flex-col gap-4 border-t pt-5 text-sm landing-muted landing-rule sm:flex-row sm:items-center sm:justify-between">
          <span>Sitterfolio · Built for independent pet sitters.</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
