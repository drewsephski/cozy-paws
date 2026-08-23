import type { MetadataRoute } from 'next';
import { getAppOrigin } from '@/lib/app-url';

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/auth', '/build', '/conversation/', '/launch', '/pay/', '/reset-password']
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin
  };
}
