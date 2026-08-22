import { protocol, rootDomain } from './utils';

export function getAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${rootDomain}`;
}

export function getPublicSiteUrl(subdomain: string) {
  return `${protocol}://${subdomain}.${rootDomain}`;
}
