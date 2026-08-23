import { HeroStartButton, SubdomainForm } from './subdomain-form';
import Link from 'next/link';
import { ArrowRight, Check, Inbox, Link2, MapPin, PawPrint, Send } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';
import { NoiseTexture } from '@/components/ui/noise-texture';
import { getAppOrigin } from '@/lib/app-url';

export const metadata = {
  title: 'Pet Sitter Website Builder',
  description:
    'Build a simple pet-sitting website with your services, service area, and an availability request form. No website design experience needed.',
  alternates: { canonical: '/' }
};

export default async function HomePage() {
  const session = await getSession();
  const signedIn = Boolean(session);
  const appOrigin = getAppOrigin();
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Sitterfolio',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'A website builder and inquiry inbox for independent pet sitters.',
        url: appOrigin
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What can I put on my pet-sitting website?', acceptedAnswer: { '@type': 'Answer', text: 'You can publish your name or business name, photo, service area, services, contact details, and an availability request form.' } },
          { '@type': 'Question', name: 'Do I need to know how to design a website?', acceptedAnswer: { '@type': 'Answer', text: 'No. Sitterfolio guides you through the details and creates the page for you.' } },
          { '@type': 'Question', name: 'How do pet owners contact me?', acceptedAnswer: { '@type': 'Answer', text: 'Pet owners use the availability form on your page. Their dates and care details appear in your sitter dashboard.' } }
        ]
      }
    ]
  };
  return (
    <div className="landing-shell min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <SiteHeader floating signedIn={signedIn} />

      <main>
        <section className="relative overflow-hidden border-b landing-rule">
          <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid min-h-[calc(100svh-1rem)] w-full max-w-6xl min-w-0 items-center gap-12 px-5 pb-16 pt-28 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:px-8 lg:pb-24 lg:pt-32">
            <div className="min-w-0">
              <p className="mb-6 flex items-center text-sm font-medium landing-muted"><PawPrint aria-hidden="true" className="mr-2 size-4 landing-accent" strokeWidth={2.25} />A simple website for your pet-sitting business</p>
              <h1 className="max-w-xl text-5xl font-bold tracking-[-.04em] sm:text-6xl lg:text-7xl">Turn &quot;Are you available?&quot; into an organized request.</h1>
              <p className="mt-6 max-w-lg text-lg leading-8 landing-muted">Publish your services, service area, and photo on one page. Pet owners can send their dates and care details before you start the conversation.</p>
              <div className="mt-8">
                {signedIn ? <Link href="/admin" className="landing-cta">Open dashboard<ArrowRight aria-hidden="true" className="size-4" /></Link> : <HeroStartButton />}
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm landing-muted">
                <span className="flex items-center gap-2"><Check aria-hidden="true" className="size-4 landing-accent" />A shareable web address</span>
                <span className="flex items-center gap-2"><Check aria-hidden="true" className="size-4 landing-accent" />No site design needed</span>
                <span className="flex items-center gap-2"><Check aria-hidden="true" className="size-4 landing-accent" />Inquiries in one inbox</span>
              </div>
            </div>

            <section id="site-address" className="landing-panel relative w-full scroll-mt-24 overflow-hidden border p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,.28)] sm:p-8 md:max-w-2xl md:justify-self-center lg:max-w-none">
              <NoiseTexture className="opacity-[.055] dark:opacity-[.1]" frequency={0.55} slope={0.2} />
              <div className="relative">
                <div className="mb-8 flex items-start justify-between gap-4"><div><p className="text-sm font-medium landing-muted">Start here</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Choose your site address</h2></div><div className="landing-accent-soft relative grid size-9 place-items-center overflow-hidden rounded-lg landing-accent"><NoiseTexture className="opacity-15" frequency={0.7} octaves={4} /><PawPrint aria-hidden="true" className="relative size-4" /></div></div>
                <SubdomainForm />
                <p className="mt-5 text-center text-xs landing-muted">Build the draft first. Create an account when you publish.</p>
              </div>
            </section>
          </div>
        </section>

        <section className="border-b landing-rule">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:px-8 lg:py-28">
            <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
              <h2 className="landing-section-title max-w-[12ch] font-semibold">Your pet-sitting details, in one reliable place.</h2>
              <p className="mt-6 max-w-md leading-7 landing-muted">Sitterfolio gives independent pet sitters a focused business page and a better way to collect new requests. You fill in the details. The page is built for you.</p>
            </div>
            <div className="divide-y landing-rule border-y landing-rule">
              {[
                [PawPrint, 'Explain the care you offer', 'Add your photo, services, service area, and a short introduction in your own words.'],
                [MapPin, 'Share one reliable address', 'Use the same link in follow-ups, email signatures, social profiles, or business cards.'],
                [Inbox, 'Keep every request together', 'Clients send dates and care details into one sitter dashboard instead of an old message thread.']
              ].map(([Icon, title, body]) => (
                <article key={String(title)} className="grid gap-5 py-8 sm:grid-cols-[3rem_minmax(0,1fr)] sm:py-10">
                  <div className="landing-accent-soft relative grid size-11 place-items-center overflow-hidden rounded-lg landing-accent"><NoiseTexture className="opacity-15" frequency={0.7} octaves={4} /><Icon aria-hidden="true" className="relative size-5" /></div>
                  <div><h3 className="text-xl font-semibold tracking-[-.02em]">{String(title)}</h3><p className="mt-2 max-w-xl leading-7 landing-muted">{String(body)}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b landing-rule">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <div className="max-w-2xl"><p className="text-sm font-medium landing-accent">How Sitterfolio works</p><h2 className="mt-3 landing-section-title font-semibold">Build the page. Share the link. Reply from your dashboard.</h2></div>
            <div className="mt-12 grid gap-px overflow-hidden border landing-rule bg-border md:grid-cols-3">
              {[
                [Link2, '1. Choose your address', 'Pick a memorable Sitterfolio address, then add your name, services, service area, and contact details.'],
                [Send, '2. Share it with pet owners', 'Add the link to your social profiles, email signature, business card, or client follow-up messages.'],
                [Inbox, '3. Review each request', 'See the requested service, dates, pets, and care notes together before you reply.']
              ].map(([Icon, title, body]) => <article key={String(title)} className="bg-background p-7 sm:p-9"><Icon aria-hidden="true" className="size-5 landing-accent" /><h3 className="mt-8 text-xl font-semibold tracking-tight">{String(title)}</h3><p className="mt-3 leading-7 landing-muted">{String(body)}</p></article>)}
            </div>
          </div>
        </section>

        <section className="border-b landing-rule">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)] lg:px-8 lg:py-28">
            <div><p className="text-sm font-medium landing-accent">Common questions</p><h2 className="mt-3 landing-section-title font-semibold">What pet sitters ask before building a site.</h2></div>
            <div className="divide-y border-y landing-rule">
              {[
                ['What can I put on my pet-sitting website?', 'Your page can include your name or business name, photo, service area, services, contact details, and an availability request form.'],
                ['Do I need to know how to design a website?', 'No. The builder asks for your business details one step at a time and turns them into a finished page.'],
                ['How do pet owners contact me?', 'They send an availability request from your page. You receive their dates, service request, pet details, and message in your dashboard.'],
                ['Does Sitterfolio confirm bookings for me?', 'No. You decide whether you are available and confirm care directly with the pet owner. Sitterfolio keeps the request and conversation organized.']
              ].map(([question, answer]) => <article key={question} className="py-7"><h3 className="text-lg font-semibold">{question}</h3><p className="mt-2 max-w-2xl leading-7 landing-muted">{answer}</p></article>)}
            </div>
          </div>
        </section>

      </main>

      <footer className="mx-auto grid min-h-[28rem] w-full max-w-6xl grid-rows-[auto_1fr_auto] gap-10 px-5 py-16 lg:px-8 lg:py-20">
        <div><p className="landing-section-title max-w-[18ch] font-semibold">Give your pet-care business a home online.</p><div className="mt-7">{signedIn ? <Link href="/admin" className="landing-cta">Open dashboard<ArrowRight aria-hidden="true" className="size-4" /></Link> : <HeroStartButton />}</div></div>
        <div className="row-start-3 flex flex-col gap-4 border-t pt-5 text-sm landing-muted landing-rule sm:flex-row sm:items-center sm:justify-between">
          <span>Sitterfolio · Built for independent pet sitters.</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
