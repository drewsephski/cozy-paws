import type { MetadataRoute } from 'next';
import { getAppOrigin } from '@/lib/app-url';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: getAppOrigin(), changeFrequency: 'weekly', priority: 1 }];
}
