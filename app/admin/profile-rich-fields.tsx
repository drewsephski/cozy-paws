import type { BusinessProfile } from '@/lib/profile-ownership';

const fields = [
  { name: 'about', label: 'About', maximum: 3000, rows: 7, placeholder: 'Share your approach, background, and the kind of care pet owners can expect.' },
  { name: 'careRoutine', label: 'Care routine', maximum: 1500, rows: 4, placeholder: 'Describe a typical day of walks, meals, play, and rest.' },
  { name: 'homeEnvironment', label: 'Home environment', maximum: 1500, rows: 4, placeholder: 'Describe your home, yard, household, and supervision.' },
  { name: 'petPreferences', label: 'Pet preferences', maximum: 1500, rows: 4, placeholder: 'Share the pets, sizes, ages, or temperaments you are comfortable caring for.' },
  { name: 'experienceSummary', label: 'Experience', maximum: 1500, rows: 4, placeholder: 'Summarize relevant pet-care experience.' },
  { name: 'specialCareSummary', label: 'Special care', maximum: 1500, rows: 4, placeholder: 'Describe medication, senior, puppy, or other special-care experience without overstating credentials.' }
] as const;

export function ProfileCareFields({ site }: { site: BusinessProfile }) {
  return <div className="contents">
    {fields.map((field) => <div key={field.name} className="sm:col-span-2"><label htmlFor={field.name} className="mb-1.5 block text-xs font-medium text-muted-foreground">{field.label}</label><textarea id={field.name} name={field.name} defaultValue={site[field.name] || ''} maxLength={field.maximum} rows={field.rows} placeholder={field.placeholder} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10" /></div>)}
  </div>;
}

export function ProfileServiceFields({ site }: { site: BusinessProfile }) {
  const services = site.services ?? [];
  if (!services.length) return <p className="sm:col-span-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm leading-6 text-muted-foreground">Choose and save your services first. You can then return here to add a description and starting price for each one.</p>;

  return <div className="sm:col-span-2 space-y-3">
    <div><h3 className="text-sm font-semibold">Details for each service</h3><p className="mt-1 text-xs text-muted-foreground">Starting prices are descriptive and not payment quotes.</p></div>
    {services.map((service, index) => { const detail = site.serviceDetails?.[service] ?? {}; return <fieldset key={service} className="rounded-xl border border-border p-4"><legend className="px-1 text-sm font-semibold">{service}</legend><input type="hidden" name={`serviceDetail.${index}.name`} value={service} /><div className="mt-2 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><label className="text-xs text-muted-foreground" htmlFor={`service-${index}-description`}>Description</label><textarea id={`service-${index}-description`} name={`serviceDetail.${index}.description`} defaultValue={detail.description || ''} maxLength={1000} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm" /></div><div><label className="text-xs text-muted-foreground" htmlFor={`service-${index}-price`}>Starting price</label><input id={`service-${index}-price`} name={`serviceDetail.${index}.startingPrice`} defaultValue={detail.startingPrice || ''} maxLength={80} placeholder="$45" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div><div><label className="text-xs text-muted-foreground" htmlFor={`service-${index}-unit`}>Billing unit</label><input id={`service-${index}-unit`} name={`serviceDetail.${index}.billingUnit`} defaultValue={detail.billingUnit || ''} maxLength={80} placeholder="per night" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div></div></fieldset>; })}
  </div>;
}
