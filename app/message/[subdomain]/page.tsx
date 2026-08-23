import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { getSession } from '@/lib/session';
import { profiles } from '@/lib/profiles';
import { privatePageMetadata } from '@/lib/seo';
import { MessageStarter } from './message-starter';

export const metadata = privatePageMetadata;

export default async function StartMessagePage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const callbackURL = `/message/${encodeURIComponent(subdomain)}`;
  const session = await getSession();

  if (!session) redirect(`/auth?mode=sign-up&callbackURL=${encodeURIComponent(callbackURL)}`);

  const profile = await profiles.get(subdomain);
  if (!profile) notFound();

  const sitterName = profile.sitterName || profile.businessName || `${subdomain}'s care`;

  return (
    <div className="min-h-screen bg-muted/30 px-5 py-10 sm:py-16">
      <main className="mx-auto w-full max-w-xl">
        <Link href={`/s/${subdomain}`} className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition hover:text-foreground">Back to {sitterName}&apos;s site</Link>
        <section className="mt-5 rounded-xl bg-card p-6 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_18px_50px_-36px_rgba(0,0,0,.35)] sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><MessageCircle className="size-5" aria-hidden="true" /></span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Chat with {sitterName}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Send your first message here. Your private conversation will open as soon as it&apos;s sent.</p>
          <MessageStarter
            subdomain={subdomain}
            sitterName={sitterName}
            customer={{ name: session.user.name, email: session.user.email }}
          />
        </section>
      </main>
    </div>
  );
}
