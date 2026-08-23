'use client';

import { useFormStatus } from 'react-dom';
import { Spokes } from '@/components/ui/spokes';

export function CheckoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-75 disabled:shadow-sm"
    >
      {pending && <Spokes className="size-4" aria-hidden="true" />}
      {pending ? 'Opening Stripe...' : 'Continue to secure checkout'}
    </button>
  );
}
