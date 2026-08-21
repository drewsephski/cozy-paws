'use client';

import { upload } from '@vercel/blob/client';
import { useState } from 'react';
import { saveProfileImageAction } from '@/app/actions';

export function ProfileImageUpload({ subdomain, currentImageUrl }: { subdomain: string; currentImageUrl?: string }) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl);
  const [status, setStatus] = useState('');

  async function handleChange(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus('Use a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus('Images must be smaller than 5 MB.');
      return;
    }

    setStatus('Uploading…');
    try {
      const blob = await upload(`profiles/${subdomain}/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({ subdomain })
      });
      const formData = new FormData();
      formData.set('subdomain', subdomain);
      formData.set('imageUrl', blob.url);
      await saveProfileImageAction(formData);
      setImageUrl(blob.url);
      setStatus('Photo saved.');
    } catch {
      setStatus('Upload failed. Check your Blob connection and try again.');
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-[#f3f7f1] p-4">
      {imageUrl ? <img src={imageUrl} alt="Your profile" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#dfeadd] text-3xl">🐾</div>}
      <div>
        <p className="font-medium">Profile photo</p>
        <p className="mb-2 text-xs text-gray-500">JPG, PNG, or WebP up to 5 MB</p>
        <label className="cursor-pointer rounded-lg bg-[#27332c] px-3 py-2 text-sm font-medium text-white hover:bg-[#3b4a40]">
          {status === 'Uploading…' ? 'Uploading…' : 'Choose photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleChange(event.target.files?.[0])} disabled={status === 'Uploading…'} />
        </label>
        {status && status !== 'Uploading…' && <p className="mt-2 text-xs text-gray-600">{status}</p>}
      </div>
    </div>
  );
}
