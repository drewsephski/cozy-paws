'use client';

import { useState } from 'react';
import { ArrowRight, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canonicalizeRoverProfileUrl } from '@/lib/domain/rover-profile-url';
import { useRouter } from 'next/navigation';

export const ROVER_ATTESTATION = 'I own this Rover profile and have permission to import its visible content.';
export type RoverImportDraft = { roverUrl: string; attestationAccepted: true; attestationVersion: 'visible-content-v1' };

export function RoverImportCard({ site, onChoose, initialValue }: { site?: string; onChoose?: (draft: RoverImportDraft) => void; initialValue?: RoverImportDraft }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(Boolean(initialValue));
  const [url, setUrl] = useState(initialValue?.roverUrl ?? '');
  const [accepted, setAccepted] = useState(Boolean(initialValue));
  const [error, setError] = useState('');

  function choose() {
    try {
      const roverUrl = canonicalizeRoverProfileUrl(url);
      if (!accepted) throw new Error('Confirm that you own this profile and may import its visible content.');
      setError('');
      const draft = { roverUrl, attestationAccepted: true as const, attestationVersion: 'visible-content-v1' as const };
      if (onChoose) onChoose(draft);
      else {
        try { const current = JSON.parse(localStorage.getItem('sitterfolio-draft') || '{}'); localStorage.setItem('sitterfolio-draft', JSON.stringify({ ...current, roverImport: draft })); }
        catch { setError('This browser could not save the import shortcut. Allow site storage or continue with manual setup.'); return; }
        router.push(`/admin/import/rover?site=${encodeURIComponent(site || '')}`);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Enter a valid Rover profile URL.'); }
  }

  return <section className="rounded-2xl border border-emerald-700/20 bg-emerald-50/55 p-5 dark:bg-emerald-950/20">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"><WandSparkles className="size-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="font-semibold">Already have a Rover profile?</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Bring over the details you already wrote. You&apos;ll review every field before anything changes.</p></div></div>
    {!expanded && <Button type="button" variant="outline" className="mt-4" onClick={() => setExpanded(true)}>Import from Rover <ArrowRight aria-hidden="true" /></Button>}
    {expanded && <div className="mt-5 space-y-4">
      <div><label htmlFor={`rover-url-${site ?? 'build'}`} className="mb-1.5 block text-sm font-medium">Your public Rover profile URL</label><input id={`rover-url-${site ?? 'build'}`} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.rover.com/members/your-profile/" className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-emerald-500/15" /></div>
      <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 size-4" /><span>{ROVER_ATTESTATION}</span></label>
      <p className="text-xs leading-5 text-muted-foreground">After sign-in, the visible page is sent to ScreenshotOne and a privacy-restricted Gemini endpoint through OpenRouter. Nothing is published until you apply your review.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="button" onClick={choose}>{onChoose ? 'Continue with Rover' : 'Start a Rover import'} <ArrowRight aria-hidden="true" /></Button>
    </div>}
  </section>;
}
