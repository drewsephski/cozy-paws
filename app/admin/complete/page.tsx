import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { getSubdomainData } from '@/lib/subdomains';
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
  const subdomain = String(site || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const tenant = subdomain ? await getSubdomainData(subdomain) : null;

  if (!tenant?.onboardingCompletedAt || tenant.ownerId !== session.user.id) redirect('/admin');

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader dashboard signedIn />
      <main>
        <OnboardingComplete tenant={{ subdomain, ...tenant }} />
      </main>
    </div>
  );
}
