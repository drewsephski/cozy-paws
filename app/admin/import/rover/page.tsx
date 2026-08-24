import { notFound, redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { getSession } from '@/lib/session';
import { profiles } from '@/lib/profiles';
import { RoverImportClient } from './rover-import-client';
import { isRoverImportPrepareAvailable } from '@/lib/profile-import/config';

export default async function RoverImportPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/auth?callbackURL=%2Fadmin');
  if (!isRoverImportPrepareAvailable()) notFound();
  const subdomain = String((await searchParams).site || '');
  const site = await profiles.getOwned(subdomain, session.user.id);
  if (!site) notFound();
  return <div className="min-h-screen bg-background"><SiteHeader dashboard signedIn /><RoverImportClient site={{ subdomain: site.subdomain, sitterName: site.sitterName, businessName: site.businessName, onboardingCompletedAt: site.onboardingCompletedAt }} /></div>;
}
