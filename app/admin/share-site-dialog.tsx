'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Globe2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ShareableSite = {
  name: string;
  subdomain: string;
  url: string;
};

export function ShareSiteDialog({ sites }: { sites: ShareableSite[] }) {
  const [open, setOpen] = useState(false);
  const [selectedSubdomain, setSelectedSubdomain] = useState(sites[0]?.subdomain ?? '');
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const selectedSite = sites.find((site) => site.subdomain === selectedSubdomain) ?? sites[0];

  useEffect(() => {
    if (!open) setStatus('idle');
  }, [open]);

  async function copyLink() {
    if (!selectedSite) return;

    try {
      await navigator.clipboard.writeText(selectedSite.url);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="mt-5">
          <Share2 aria-hidden="true" />
          Share a site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a site to share</DialogTitle>
          <DialogDescription>Select a site, then copy its link.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2" role="radiogroup" aria-label="Sites to share">
          {sites.map((site) => {
            const selected = site.subdomain === selectedSite?.subdomain;
            return (
              <label
                key={site.subdomain}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/60',
                  selected && 'border-emerald-500/70 bg-emerald-500/5 ring-2 ring-emerald-500/15'
                )}
              >
                <input
                  type="radio"
                  name="share-site"
                  value={site.subdomain}
                  checked={selected}
                  onChange={() => {
                    setSelectedSubdomain(site.subdomain);
                    setStatus('idle');
                  }}
                  className="sr-only"
                />
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-emerald-600 dark:text-emerald-400">
                  <Globe2 className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{site.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{site.subdomain}</span>
                </span>
                <span className={cn('grid size-5 place-items-center rounded-full border', selected && 'border-emerald-500 bg-emerald-500 text-white')}>
                  {selected && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                </span>
              </label>
            );
          })}
        </div>

        <div className="min-h-5" aria-live="polite">
          {status === 'copied' && <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="size-4" aria-hidden="true" />Link copied. Paste it anywhere.</p>}
          {status === 'error' && <p className="text-sm text-destructive">We couldn&apos;t copy the link. Check your browser&apos;s clipboard permission and try again.</p>}
        </div>

        <DialogFooter>
          <Button type="button" onClick={copyLink} disabled={!selectedSite} className={cn(status === 'copied' && 'bg-emerald-600 hover:bg-emerald-600')}>
            {status === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {status === 'copied' ? 'Copied' : 'Copy link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
