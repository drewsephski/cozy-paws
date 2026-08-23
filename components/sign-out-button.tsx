'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Spokes } from '@/components/ui/spokes';

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        await authClient.signOut();
        router.push('/');
        router.refresh();
      }}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      {isPending && <Spokes className="size-4" aria-hidden="true" />}
      {isPending ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
