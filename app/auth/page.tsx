import { redirect } from 'next/navigation';
import { PawPrint } from 'lucide-react';
import { AuthForm } from '@/components/auth-form';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';
import { profiles } from '@/lib/profiles';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata;

function safeCallbackURL(value?: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/admin';
}

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ callbackURL?: string; mode?: string }> }) {
  const session = await getSession();
  const { callbackURL, mode } = await searchParams;
  const requestedCallback = safeCallbackURL(callbackURL);

  if (session) {
    if (requestedCallback.startsWith('/message/')) redirect(requestedCallback);

    const sites = await profiles.listOwned(session.user.id);
    const hasIncompleteSite = sites.some((site) => site.onboardingCompletedAt === null);

    // Keep authenticated users moving forward. The dashboard renders the
    // first incomplete onboarding step, while a new user starts at the
    // address form instead of seeing an empty dashboard.
    if (hasIncompleteSite) redirect('/admin');
    if (sites.length === 0) redirect('/');
    redirect(requestedCallback);
  }

  const isLaunching = callbackURL === '/launch';
  const isMessaging = requestedCallback.startsWith('/message/');

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-5 py-12">
        <section className="w-full max-w-md rounded-xl bg-card p-6 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_18px_50px_-36px_rgba(0,0,0,.35)] sm:p-8">
          <span className="mb-6 grid size-10 place-items-center rounded-xl bg-emerald-700 text-white"><PawPrint aria-hidden="true" className="size-5" /></span>
          <h1 className="text-3xl font-semibold tracking-tight">{isLaunching ? 'Save and launch your site' : isMessaging ? 'Start your conversation' : 'Welcome to Sitterfolio'}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{isLaunching ? 'Create an account to publish your finished draft and manage inquiries.' : isMessaging ? 'Create an account or sign in to message this sitter privately.' : 'Sign in to manage your pet-care website.'}</p>
          <div className="mt-7">
            <AuthForm
              initialMode={mode === 'sign-up' ? 'sign-up' : mode === 'forgot-password' ? 'forgot-password' : 'sign-in'}
              googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
