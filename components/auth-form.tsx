'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2 } from '@/components/ui/animated-icons';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spokes } from '@/components/ui/spokes';
import { safeAuthCallbackURL } from '@/lib/auth-callback';

type Mode = 'sign-in' | 'sign-up' | 'forgot-password';

export function AuthForm({
  initialMode = 'sign-in',
  googleEnabled = false,
  oauthError
}: {
  initialMode?: Mode;
  googleEnabled?: boolean;
  oauthError?: string;
}) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(oauthError ? 'Google sign-in could not be completed. Please try again.' : '');
  const [success, setSuccess] = useState('');

  const requestedCallback = searchParams.get('callbackURL');
  const callbackURL = safeAuthCallbackURL(requestedCallback);
  const isStartingConversation = callbackURL.startsWith('/message/');

  async function handleGoogleSignIn() {
    setError('');
    setSuccess('');
    setIsPending(true);

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL,
        errorCallbackURL: `/auth?callbackURL=${encodeURIComponent(callbackURL)}`
      });

      if (result.error) {
        setError(result.error.message || 'Google sign-in could not be started. Please try again.');
        setIsPending(false);
      }
    } catch {
      setError('We could not reach Google. Check your connection and try again.');
      setIsPending(false);
    }
  }

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

      {googleEnabled && mode !== 'forgot-password' && (
        <>
          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            disabled={isPending}
            onClick={handleGoogleSignIn}
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.4Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.39 13.87A6.02 6.02 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z" />
              <path fill="#EA4335" d="M12 6c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z" />
            </svg>
            Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className={googleEnabled && mode !== 'forgot-password' ? 'space-y-4' : 'mt-6 space-y-4'}>
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
