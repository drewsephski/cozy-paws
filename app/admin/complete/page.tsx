import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { profiles } from '@/lib/profiles';
import { OnboardingComplete } from '../dashboard';
import { getSession } from '@/lib/session';

export default async function OnboardingCompletePage({
  searchParams
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/auth?callbackURL=%2Fadmin');

  const { site } = await searchParams;
  const tenant = site ? await profiles.getOwned(site, session.user.id) : null;

  if (!tenant?.onboardingCompletedAt) redirect('/admin');

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader dashboard signedIn />
      <main>
        <OnboardingComplete tenant={tenant} />
      </main>
    </div>
  );
}
