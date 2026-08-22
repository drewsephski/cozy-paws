'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const invalidToken = searchParams.get('error') === 'INVALID_TOKEN' || !token;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setError('');
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get('newPassword') || '');
    const confirmation = String(formData.get('confirmation') || '');

    if (newPassword !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setIsPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        setError('This reset link is invalid or has expired. Request a new one.');
        return;
      }
      setComplete(true);
    } catch {
      setError('We could not reset your password. Check your connection and try again.');
    } finally {
      setIsPending(false);
    }
  }

  if (complete) {
    return (
      <div role="status" className="space-y-5">
        <p className="flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />Your password has been reset.</p>
        <Button asChild className="w-full"><Link href="/auth">Sign in with your new password</Link></Button>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="space-y-5">
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">This reset link is invalid or has expired.</p>
        <Button asChild className="w-full"><Link href="/auth?mode=forgot-password">Request a new reset link</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmation">Confirm new password</Label>
        <Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {isPending ? 'Resetting password...' : 'Reset password'}
      </Button>
    </form>
  );
}
