'use server';

import { redis } from '@/lib/redis';
import { isValidIcon } from '@/lib/subdomains';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { rootDomain, protocol } from '@/lib/utils';

export async function createSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get('subdomain') as string;
  const icon = formData.get('icon') as string;

  if (!subdomain || !icon) {
    return { success: false, error: 'Subdomain and icon are required' };
  }

  if (!isValidIcon(icon)) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'Please enter a valid emoji (maximum 10 characters)'
    };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain.length < 3 || sanitizedSubdomain.length > 30) {
    return { subdomain, icon, success: false, error: 'Choose a name between 3 and 30 characters.' };
  }

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const subdomainAlreadyExists = await redis.get(
    `subdomain:${sanitizedSubdomain}`
  );
  if (subdomainAlreadyExists) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  await redis.set(`subdomain:${sanitizedSubdomain}`, {
    emoji: icon,
    createdAt: Date.now(),
    businessName: 'Happy Tails Care',
    tagline: 'Kind, reliable care for your favorite family members.',
    location: 'Your neighborhood',
    services: ['Dog walking', 'Drop-in visits', 'Overnight stays'],
    phone: '',
    email: ''
  });

  redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}`);
}

export async function saveProfileAction(formData: FormData): Promise<void> {
  const subdomain = String(formData.get('subdomain') || '');
  const current = await redis.get<Record<string, unknown>>(`subdomain:${subdomain}`);
  if (!current) return;

  await redis.set(`subdomain:${subdomain}`, {
    ...current,
    businessName: String(formData.get('businessName') || '').slice(0, 80),
    tagline: String(formData.get('tagline') || '').slice(0, 160),
    location: String(formData.get('location') || '').slice(0, 80),
    phone: String(formData.get('phone') || '').slice(0, 40),
    email: String(formData.get('email') || '').slice(0, 120),
    services: String(formData.get('services') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8)
  });
  revalidatePath('/admin');
  revalidatePath(`/s/${subdomain}`);
}

export async function createLeadAction(formData: FormData): Promise<void> {
  const subdomain = String(formData.get('subdomain') || '');
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  if (!subdomain || !name || !email) return;
  const leads = (await redis.get<Array<Record<string, unknown>>>(`leads:${subdomain}`)) || [];
  await redis.set(`leads:${subdomain}`, [{ name, email, dates: String(formData.get('dates') || ''), message: String(formData.get('message') || ''), createdAt: Date.now() }, ...leads].slice(0, 100));
  revalidatePath(`/s/${subdomain}`);
  revalidatePath('/admin');
}

export async function saveProfileImageAction(formData: FormData): Promise<void> {
  const subdomain = String(formData.get('subdomain') || '');
  const imageUrl = String(formData.get('imageUrl') || '');
  const current = await redis.get<Record<string, unknown>>(`subdomain:${subdomain}`);
  if (!current || !imageUrl.startsWith('https://')) return;
  await redis.set(`subdomain:${subdomain}`, { ...current, profileImageUrl: imageUrl });
  revalidatePath('/admin');
  revalidatePath(`/s/${subdomain}`);
}

export async function deleteSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get('subdomain');
  await redis.del(`subdomain:${subdomain}`);
  revalidatePath('/admin');
  return { success: 'Domain deleted successfully' };
}
