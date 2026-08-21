'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
  const [success, setSuccess] = useState('');

  const requestedCallback = searchParams.get('callbackURL');
  const callbackURL = requestedCallback?.startsWith('/') && !requestedCallback.startsWith('//')
    ? requestedCallback
    : '/admin';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const name = String(formData.get('name') || '').trim();

    try {
      const result = mode === 'sign-up'
        ? await authClient.signUp.email({ name, email, password, callbackURL })
        : await authClient.signIn.email({ email, password, callbackURL });

      if (result.error) {
        setError(result.error.message || 'Authentication failed. Please check your details and try again.');
        return;
      }

      const session = await authClient.getSession();
      if (session.error || !session.data?.user) {
        setError('Your account was created, but we could not start your session. Please try signing in again.');
        return;
      }

      setSuccess(mode === 'sign-up' ? 'Account created. Opening your dashboard...' : 'Signed in. Opening your dashboard...');
      router.replace(callbackURL);
      router.refresh();
    } catch {
      setError('We could not reach Sitterfolio. Check your connection and try again.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1" aria-label="Authentication method">
        <button type="button" onClick={() => { setMode('sign-in'); setError(''); setSuccess(''); }} className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === 'sign-in' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Sign in</button>
        <button type="button" onClick={() => { setMode('sign-up'); setError(''); setSuccess(''); }} className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === 'sign-up' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Create account</button>
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
        {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        {success && <p role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{success}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isPending ? (mode === 'sign-up' ? 'Creating account...' : 'Signing in...') : mode === 'sign-up' ? 'Create my account' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
