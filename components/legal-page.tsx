import type { ReactNode } from 'react';
import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function LegalPage({
  title,
  summary,
  effectiveDate,
  sections
}: {
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
              <PawPrint className="size-4" aria-hidden="true" />
              Back to Sitterfolio
            </Link>
            <nav aria-label={`${title} sections`} className="mt-8 hidden border-l pl-5 lg:block">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">On this page</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="transition-colors hover:text-foreground">{section.title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Sitterfolio legal</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-.035em] sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{summary}</p>
            <p className="mt-4 text-sm text-muted-foreground">Effective {effectiveDate}</p>

            <div className="mt-10 rounded-2xl border border-emerald-700/20 bg-emerald-50/70 p-5 dark:bg-emerald-950/20 sm:p-6">
              <h2 className="font-semibold">What this means</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sitterfolio helps independent pet sitters publish a business page, receive direct inquiries, manage client details, and request payment. It does not assign sitters, guarantee care, or become a party to arrangements between sitters and pet owners.
              </p>
            </div>

            <div className="mt-12 space-y-12">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-8 border-t pt-8">
                  <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-[15px] leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-emerald-700 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-emerald-400 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </main>
      <footer className="mt-12 border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} Sitterfolio</span>
          <div className="flex gap-5"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link></div>
        </div>
      </footer>
    </div>
  );
}
