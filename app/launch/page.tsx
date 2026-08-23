import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { LaunchDraft } from '@/components/launch-draft';
import { getSession } from '@/lib/session';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata;

export default async function LaunchPage() {
  const session = await getSession();
  if (!session) redirect('/auth?callbackURL=%2Flaunch');
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader signedIn />
      <LaunchDraft />
    </div>
  );
}
