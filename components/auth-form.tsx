'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  const requestedCallback = searchParams.get('callbackURL');
  const callbackURL = requestedCallback?.startsWith('/') && !requestedCallback.startsWith('//')
    ? requestedCallback
    : '/admin';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const name = String(formData.get('name') || '').trim();

    const result = mode === 'sign-up'
      ? await authClient.signUp.email({ name, email, password, callbackURL })
      : await authClient.signIn.email({ email, password, callbackURL });

    setIsPending(false);
    if (result.error) {
      setError(result.error.message || 'Authentication failed. Please try again.');
      return;
    }

    router.push(callbackURL);
    router.refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1" aria-label="Authentication method">
        <button type="button" onClick={() => { setMode('sign-in'); setError(''); }} className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === 'sign-in' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Sign in</button>
        <button type="button" onClick={() => { setMode('sign-up'); setError(''); }} className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === 'sign-up' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Create account</button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === 'sign-up' && (
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" autoComplete="name" required maxLength={80} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} minLength={8} required />
          {mode === 'sign-up' && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Please wait…' : mode === 'sign-up' ? 'Create my account' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}

