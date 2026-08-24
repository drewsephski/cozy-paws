import type { ClientHousehold } from '@/lib/client-households';
import type { OwnedLead, ProfileRecord } from '@/lib/profile-ownership';

export type ReviewedBookingDraft = {
  householdId: string;
  sourceLeadId: string;
  petIds: string[];
  startDate: string;
  endDate: string;
};

export function editableSiteOptions(sites: ProfileRecord[]) {
  return sites.map((site) => ({ value: site.subdomain, label: site.businessName || site.sitterName || site.subdomain }));
}

export function reviewedBookingDraft(lead: OwnedLead, household: ClientHousehold): ReviewedBookingDraft | null {
  if (household.sourceLeadId !== lead.id) return null;
  return { householdId: household.id, sourceLeadId: lead.id, petIds: household.pets.map((pet) => pet.id), startDate: lead.requestedStartDate || '', endDate: lead.requestedEndDate || '' };
}
