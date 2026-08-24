'use client';

import { useState } from 'react';
import { Check, Share2 } from '@/components/ui/animated-icons';
import { Button } from '@/components/ui/button';

export function ShareSiteButton({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} pet care`, text: 'View my pet-sitting site:', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return <Button type="button" variant="outline" size="sm" onClick={share} aria-live="polite">{copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}{copied ? 'Link copied' : 'Share site'}</Button>;
}
