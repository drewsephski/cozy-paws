import { SiteHeader } from '@/components/site-header';
import { DraftBuilder } from '@/components/draft-builder';
import { getSession } from '@/lib/session';

export default async function BuildPage() {
  const session = await getSession();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader signedIn={Boolean(session)} />
      <DraftBuilder signedIn={Boolean(session)} />
    </div>
  );
}

