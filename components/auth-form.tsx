'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spokes } from '@/components/ui/spokes';

type Mode = 'sign-in' | 'sign-up' | 'forgot-password';

export function AuthForm({ initialMode = 'sign-in' }: { initialMode?: Mode }) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const requestedCallback = searchParams.get('callbackURL');
  const callbackURL = requestedCallback?.startsWith('/') && !requestedCallback.startsWith('//')
    ? requestedCallback
    : '/admin';
  const isStartingConversation = callbackURL.startsWith('/message/');

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
      if (mode === 'forgot-password') {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (result.error) {
          setError('We could not send a reset link right now. Please try again.');
          return;
        }

        setSuccess('If an account exists for that email, we sent a password reset link.');
        return;
      }

      const result = mode === 'sign-up'
        ? await authClient.signUp.email({ name, email, password, callbackURL })
        : await authClient.signIn.email({ email, password, callbackURL });

      if (result.error) {
        setError(result.error.message || 'Authentication failed. Please check your details and try again.');
        return;
      }

      // Better Auth has already created the durable session and returned the
      // authenticated user. A second getSession request is race-prone here:
      // it can run before the browser has committed the Set-Cookie response
      // and incorrectly turn a successful auth response into an error.
      if (!result.data?.user) {
        setError('Authentication succeeded, but no user session was returned. Please try again.');
        return;
      }

      setSuccess(isStartingConversation
        ? mode === 'sign-up' ? 'Account created. Opening your conversation...' : 'Signed in. Opening your conversation...'
        : mode === 'sign-up' ? 'Account created. Opening your dashboard...' : 'Signed in. Opening your dashboard...');
      // Use a full navigation so the next server request observes the session
      // cookie set by Better Auth before protected routes evaluate it.
      window.location.assign(callbackURL);
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

      {mode === 'forgot-password' && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Reset your password</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Enter your account email and we&apos;ll send you a secure reset link.</p>
        </div>
      )}

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
        {mode !== 'forgot-password' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              {mode === 'sign-in' && <button type="button" onClick={() => { setMode('forgot-password'); setError(''); setSuccess(''); }} className="text-xs font-medium text-emerald-700 hover:underline">Forgot password?</button>}
            </div>
            <Input id="password" name="password" type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} minLength={8} required />
            {mode === 'sign-up' && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
          </div>
        )}
        {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        {success && <p role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{success}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Spokes className="size-4" aria-hidden="true" />}
          {isPending
            ? mode === 'sign-up' ? 'Creating account...' : mode === 'forgot-password' ? 'Sending reset link...' : 'Signing in...'
            : mode === 'sign-up' ? 'Create my account' : mode === 'forgot-password' ? 'Send reset link' : 'Sign in'}
        </Button>
        {mode === 'forgot-password' && <button type="button" onClick={() => { setMode('sign-in'); setError(''); setSuccess(''); }} className="w-full text-sm font-medium text-muted-foreground hover:text-foreground">Back to sign in</button>}
      </form>
    </div>
  );
}
