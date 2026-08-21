import { SubdomainForm } from './subdomain-form';
import { PawPrint } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';

export const metadata = {
  title: 'Website for Pet Sitters',
  description:
    'Create a professional pet sitter website and contact page so clients can reach you directly, including clients you meet through Rover.'
};

export default async function HomePage() {
  const session = await getSession();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader signedIn={Boolean(session)} />

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-16 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
        <section>
          <p className="mb-6 flex items-center text-sm font-medium text-muted-foreground"><PawPrint aria-hidden="true" className="mr-2 size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />Your pet-care business, easy to share</p>
          <h1 className="max-w-xl text-5xl font-bold tracking-[-.055em] sm:text-6xl lg:text-7xl">Your own website for pet-sitting clients.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Create a polished pet sitter contact page with your services, photo, and availability form—then share one direct link anywhere you talk with clients.</p>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span>✓ Your own web address</span><span>✓ No design work</span><span>✓ Direct inquiries</span>
          </div>
        </section>

        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,.28)] sm:p-8 md:max-w-2xl md:justify-self-center lg:max-w-none">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div><p className="text-sm font-medium text-muted-foreground">Start here</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Choose your site address</h2></div>
            <div className="grid size-8 place-items-center rounded-full border border-border bg-muted/40 text-emerald-700 dark:text-emerald-400"><PawPrint aria-hidden="true" className="size-4" /></div>
          </div>
          <SubdomainForm />
          <p className="mt-5 text-center text-xs text-muted-foreground">No account needed until you’re ready to launch.</p>
        </section>
      </main>

      <section className="border-t border-border/70 bg-muted/20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Build your direct client channel</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How to get pet-sitting clients off Rover</h2>
          </div>
          <div className="space-y-5 text-base leading-7 text-muted-foreground">
            <p>Rover can help pet owners discover you, but your business also needs a simple place clients can return to when they need care again. Sitterfolio gives you a professional website and pet sitter contact page that you can share directly with people who already know and trust you.</p>
            <p>Use your Sitterfolio link in your follow-up messages, email signature, social profiles, or business cards. Clients can see your services and service areas, then send dates and care details through one direct availability form.</p>
            <p>The goal is simple: make it easy for past and future clients to contact your independent pet-care business directly. Always follow Rover’s current terms and any agreements that apply to your client relationships.</p>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-border/70 px-5 py-6 text-xs text-muted-foreground lg:px-8">
        <span>Built for independent pet sitters.</span><span>© {new Date().getFullYear()} Sitterfolio</span>
      </footer>
    </div>
  );
}
