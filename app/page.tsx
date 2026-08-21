import Link from 'next/link';
import { SubdomainForm } from './subdomain-form';
import { rootDomain } from '@/lib/utils';
import { PawPrint } from 'lucide-react';

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-xs text-background">P</span>
            platforms
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Create your corner of the web</span>
            <Link href="/admin" className="font-medium text-foreground transition-colors hover:text-muted-foreground">Admin <span aria-hidden="true">↗</span></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-16 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
        <section>
          <p className="mb-6 flex items-center text-sm font-medium text-muted-foreground"><PawPrint aria-hidden="true" className="mr-2 size-4 text-emerald-600" strokeWidth={2.25} />Simple sites for real people</p>
          <h1 className="max-w-xl text-5xl font-semibold tracking-[-.055em] sm:text-6xl lg:text-7xl">A better first hello.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Launch a warm, simple website for your dog-sitting business in minutes. No templates to wrestle with. Just a clear place for families to find you.</p>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span>✓ Your own subdomain</span><span>✓ Easy to update</span><span>✓ Ready to share</span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,.28)] sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div><p className="text-sm font-medium text-muted-foreground">Get started</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Create your page</h2></div>
            <div className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">1 min</div>
          </div>
          <SubdomainForm />
          <p className="mt-5 text-center text-xs text-muted-foreground">You can add your details and photo after creating it.</p>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-border/70 px-5 py-6 text-xs text-muted-foreground lg:px-8">
        <span>Built for the people behind the business.</span><span>© {new Date().getFullYear()} platforms</span>
      </footer>
    </div>
  );
}
