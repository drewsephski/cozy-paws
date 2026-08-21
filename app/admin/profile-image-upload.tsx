'use client';

import { upload } from '@vercel/blob/client';
import { useState } from 'react';
import { saveProfileImageAction } from '@/app/actions';
import { Camera, CheckCircle2, Loader2 } from 'lucide-react';
import {
  isProfileImageContentType,
  PROFILE_IMAGE_MAX_BYTES,
  profileImagePath
} from '@/lib/upload-authorization';

export function ProfileImageUpload({ subdomain, currentImageUrl, onUploaded }: { subdomain: string; currentImageUrl?: string; onUploaded?: (url: string) => void }) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl);
  const [status, setStatus] = useState('');

  async function handleChange(file: File | undefined) {
    if (!file) return;
    if (!isProfileImageContentType(file.type)) {
      setStatus('Use a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setStatus('Images must be smaller than 5 MB.');
      return;
    }

    setStatus('Uploading…');
    try {
      const blob = await upload(profileImagePath(subdomain, file.name), file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({ subdomain })
      });
      const formData = new FormData();
      formData.set('subdomain', subdomain);
      formData.set('imageUrl', blob.url);
      await saveProfileImageAction(formData);
      setImageUrl(blob.url);
      onUploaded?.(blob.url);
      setStatus('Photo saved.');
    } catch {
      setStatus('Upload failed. Check your Blob connection and try again.');
    }
  }

  const isUploading = status === 'Uploading…';
  const isSaved = status === 'Photo saved.';

  return (
    <div className="flex min-w-0 items-center gap-3">
      {imageUrl ? (
        <img src={imageUrl} alt="Your profile" className="size-14 shrink-0 rounded-lg border border-border object-cover" />
      ) : (
        <div className="grid size-14 shrink-0 place-items-center rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground">
          <Camera aria-hidden="true" className="size-5" />
        </div>
      )}
      <div className="min-w-0">
        <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-ring/50">
          {isUploading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Camera aria-hidden="true" className="size-4" />}
          {isUploading ? 'Uploading…' : imageUrl ? 'Change photo' : 'Choose photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleChange(event.target.files?.[0])} disabled={isUploading} />
        </label>
        <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, or WebP · 5 MB max</p>
        {status && !isUploading && <p className={`mt-1 flex items-center gap-1 text-xs ${isSaved ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{isSaved && <CheckCircle2 aria-hidden="true" className="size-3" />}{status}</p>}
      </div>
    </div>
  );
}
