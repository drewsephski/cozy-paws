import type { BusinessProfile } from '@/lib/profile-ownership';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function availabilityLabel(profile: BusinessProfile) {
  if (profile.availabilityStatus === 'LIMITED') return profile.availabilityUntil ? `Limited availability through ${dateFormatter.format(new Date(`${profile.availabilityUntil}T00:00:00Z`))}` : 'Limited availability';
  if (profile.availabilityStatus === 'UNAVAILABLE') return profile.availabilityUntil ? `Unavailable until ${dateFormatter.format(new Date(`${profile.availabilityUntil}T00:00:00Z`))}` : 'Currently unavailable';
  return 'Accepting new inquiries';
}

export function PublicProfileDetails({ profile }: { profile: BusinessProfile }) {
  const hasTrustDetails = profile.yearsExperience !== null && profile.yearsExperience !== undefined
    || Boolean(profile.careCapabilities?.length)
    || Boolean(profile.meetAndGreetExpectations)
    || Boolean(profile.cancellationExpectations)
    || Boolean(profile.selfReportedCredentials?.length);

  return <div className="mt-8 space-y-6">
    <section aria-labelledby="availability-heading" className="rounded-xl border border-emerald-700/20 bg-emerald-50/60 p-4 dark:bg-emerald-950/25">
      <h2 id="availability-heading" className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{availabilityLabel(profile)}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Availability is self-reported and may change. Ask about your dates before making plans.</p>
    </section>
    {hasTrustDetails && <section aria-labelledby="care-details-heading">
      <h2 id="care-details-heading" className="text-lg font-semibold">Care details</h2>
      {profile.yearsExperience !== null && profile.yearsExperience !== undefined && <p className="mt-3 text-sm text-muted-foreground">{profile.yearsExperience} {profile.yearsExperience === 1 ? 'year' : 'years'} of self-reported experience</p>}
      {!!profile.careCapabilities?.length && <div className="mt-3 flex flex-wrap gap-2">{profile.careCapabilities.map((capability) => <span key={capability} className="rounded-full bg-muted px-3 py-1.5 text-sm">{capability}</span>)}</div>}
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        {profile.meetAndGreetExpectations && <div><dt className="font-semibold">Meet and greet</dt><dd className="mt-1 leading-6 text-muted-foreground">{profile.meetAndGreetExpectations}</dd></div>}
        {profile.cancellationExpectations && <div><dt className="font-semibold">Cancellations</dt><dd className="mt-1 leading-6 text-muted-foreground">{profile.cancellationExpectations}</dd></div>}
      </dl>
      {!!profile.selfReportedCredentials?.length && <div className="mt-5 rounded-xl border border-border p-4"><h3 className="text-sm font-semibold">Self-reported credentials</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{profile.selfReportedCredentials.map((credential) => <li key={credential}>{credential}</li>)}</ul><p className="mt-3 text-xs leading-5 text-muted-foreground">Sitterfolio does not verify insurance, certifications, background checks, or safety claims. Ask the sitter for current details.</p></div>}
    </section>}
  </div>;
}
