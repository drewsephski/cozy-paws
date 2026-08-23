import type { OwnedLead } from '@/lib/profile-ownership';

export type InboxSite = {
  subdomain: string;
  businessName?: string;
  sitterName?: string;
};

export type SiteFilterOption = {
  subdomain: string;
  name: string;
  inquiryCount: number;
};

export function buildSiteFilterOptions(sites: InboxSite[], leads: OwnedLead[]): SiteFilterOption[] {
  return sites.map((site) => ({
    subdomain: site.subdomain,
    name: site.businessName || site.sitterName || site.subdomain,
    inquiryCount: leads.filter((lead) => lead.subdomain === site.subdomain).length
  }));
}

export function formatInquiryDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
