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

export type LeadConversationGroup = {
  email: string;
  leads: OwnedLead[];
};

export function normalizeConversationEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US');
}

export function groupLeadsByEmail(leads: OwnedLead[]): LeadConversationGroup[] {
  const groups = new Map<string, OwnedLead[]>();
  for (const lead of leads) {
    const email = normalizeConversationEmail(lead.email);
    const group = groups.get(email);
    if (group) group.push(lead);
    else groups.set(email, [lead]);
  }

  return Array.from(groups, ([email, groupedLeads]) => ({
    email,
    leads: groupedLeads.sort((a, b) => b.createdAt - a.createdAt)
  })).sort((a, b) => b.leads[0].createdAt - a.leads[0].createdAt);
}

export function buildSiteFilterOptions(sites: InboxSite[], leads: OwnedLead[]): SiteFilterOption[] {
  return sites.map((site) => ({
    subdomain: site.subdomain,
    name: site.businessName || site.sitterName || site.subdomain,
    inquiryCount: leads.filter((lead) => lead.subdomain === site.subdomain).length
  }));
}

export function formatInquiryDate(value: string) {
  const calendarDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || value;
  const date = new Date(`${calendarDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

type InquiryDates = Pick<OwnedLead, 'dates' | 'requestedStartDate' | 'requestedEndDate'>;

export function formatInquiryDateRange(lead: InquiryDates) {
  const { requestedStartDate: start, requestedEndDate: end } = lead;
  if (!start) return lead.dates?.trim() || 'Dates not provided';
  if (!end || end === start) return formatInquiryDate(start);

  const startDate = start.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || start;
  const endDate = end.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || end;
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);
  const startLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', ...(startYear === endYear ? {} : { year: 'numeric' as const })
  }).format(new Date(`${startDate}T00:00:00`));

  return `${startLabel} – ${formatInquiryDate(endDate)}`;
}

export function formatReceivedDate(value: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
