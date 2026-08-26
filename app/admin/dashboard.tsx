'use client';

import { useActionState, useEffect, useId, useRef, useState, type ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';
import { motion, useReducedMotion, type Transition, type Variants } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Spokes } from '@/components/ui/spokes';
import { Card, CardContent } from '@/components/ui/card';
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperList, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, CalendarDays, Camera, ChartNoAxesCombined, Check, CheckCircle2, ChevronDown, CircleAlert, Clock3, CreditCard, ExternalLink, Globe2, HeartHandshake, LayoutDashboard, Mail, MessageCircle, PawPrint, RotateCw, Users, type LucideIcon } from '@/components/ui/animated-icons';
import Link from 'next/link';
import { deleteSubdomainAction, refreshStripeStatusAction, startStripeOnboardingAction, type RefreshStripeStatusState } from '@/app/actions';
import type { ConnectedAccountStatus } from '@/lib/connected-accounts';
import { rootDomain, protocol } from '@/lib/utils';
import { saveProfileAction, type SaveProfileState } from '@/app/actions';
import { completeOnboardingAction } from '@/app/actions';
import { ProfileImageUpload } from './profile-image-upload';
import { ShareSiteButton } from './share-site-button';
import { DeleteSiteDialog } from './delete-site-dialog';
import { PetIcon } from '@/components/pet-icon';
import { ServiceAreaField, ServicesField, SuggestionField } from './profile-select-fields';
import { LeadInbox } from './lead-inbox';
import { BusinessPulse, type RevenueSnapshot } from './business-pulse';
import { MessagesInbox } from './messages-inbox';
import { ClientHouseholds } from './client-households';
import type { ClientHousehold } from '@/lib/client-households';
import { Bookings } from './bookings';
import type { Booking } from '@/lib/bookings';
import { editableSiteOptions, reviewedBookingDraft, type ReviewedBookingDraft } from './site-editing-model';
import type { ProfileRecord } from '@/lib/profile-ownership';
import { RoverImportCard } from '@/components/rover-import-card';
import { ProfileCareFields, ProfileServiceFields } from './profile-rich-fields';
import { ActivationChecklist } from './activation-checklist';
import { activationChecklist, nextActivationItem } from './activation-model';
import type { OwnerGrowthActivation } from '@/lib/growth-evidence';
import type { BusinessCommercialState } from '@/lib/commercial-lifecycle';
import { FoundingPlan } from './founding-plan';
import { Testimonials } from './testimonials';
import type { Testimonial } from '@/lib/trust-referral-eligibility';

type SiteProfile = ProfileRecord;

type DeleteState = {
  error?: string;
  success?: string;
};

const onboardingSteps = [
  { name: 'identity', label: 'About you', description: 'Name and business', title: 'Start with the name clients will remember', helper: 'This is the first thing pet owners see. Add your name, a business name, or both.' },
  { name: 'care', label: 'Your care', description: 'Area and services', title: 'Tell pet owners how you can help', helper: 'A short introduction, your service area, and a few clear services are enough to launch.' },
  { name: 'contact', label: 'Contact', description: 'Where replies go', title: 'Choose how clients reach you', helper: 'Inquiry alerts go to your email. A public phone number is optional.' },
  { name: 'photo', label: 'Photo', description: 'Build recognition', title: 'Put a friendly face to your care', helper: 'A clear, recent photo helps new clients feel like they already know you. You can also add one later.' }
] as const;

function SitePreview({ site, values }: { site: SiteProfile; values: Record<string, string> }) {
  const services = values.services.split(',').map((service) => service.trim()).filter(Boolean);
  return (
    <aside className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_18px_50px_-36px_rgba(0,0,0,.35)] lg:sticky lg:top-24">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-400" /><span className="size-2.5 rounded-full bg-amber-400" /><span className="size-2.5 rounded-full bg-emerald-500" />
        <div className="ml-2 min-w-0 flex-1 truncate rounded-full bg-background px-4 py-2 text-center text-xs text-muted-foreground">{site.subdomain}.{rootDomain}</div>
      </div>
      <div className="min-h-[440px] p-7 text-center sm:p-9">
        <div className="mx-auto grid size-20 place-items-center overflow-hidden rounded-full border-4 border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {values.profileImageUrl ? <img src={values.profileImageUrl} alt="Profile preview" className="size-full object-cover" /> : <PetIcon value={site.emoji} className="size-10" fallbackClassName="text-4xl" />}
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-300">{values.sitterName || values.businessName || 'Your name'}</h2>
        {values.sitterName && values.businessName && <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">{values.businessName}</p>}
        <p className="mt-2 text-sm text-muted-foreground">{values.location || `${site.subdomain}.${rootDomain}`}</p>
        <div className="mx-auto mt-7 h-28 max-w-sm rounded-xl bg-muted/70" />
        <p className="mx-auto mt-6 max-w-sm text-sm leading-6 text-muted-foreground">{values.tagline || 'Your introduction will appear here.'}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {(services.length ? services : ['Your services']).slice(0, 3).map((service) => <span key={service} className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">{service}</span>)}
        </div>
      </div>
    </aside>
  );
}

export function OnboardingComplete({ site }: { site: SiteProfile }) {
  const siteUrl = `${protocol}://${site.subdomain}.${rootDomain}`;
  useEffect(() => {
    window.localStorage.removeItem('sitterfolio-draft');
  }, []);
  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-2xl items-center justify-center px-4 py-12 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="size-8" aria-hidden="true" /></span>
        <h1 className="mt-7 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Your Sitterfolio is ready.</h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-muted-foreground">Open the live site to check it, then copy the link when you want to share it.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg"><a href={siteUrl} target="_blank" rel="noopener noreferrer">View live site <ExternalLink aria-hidden="true" /></a></Button>
          <Button asChild size="lg" variant="outline"><Link href="/admin">Go to dashboard</Link></Button>
        </div>
      </div>
    </div>
  );
}

function ProfileOnboarding({ site, commercialStates, roverImportEnabled }: { site: SiteProfile; commercialStates: BusinessCommercialState[]; roverImportEnabled: boolean }) {
  const [stepIndex, setStepIndex] = useState(() => {
    if (!site.sitterName && !site.businessName) return 0;
    if (!site.tagline || !site.location || !site.services?.length) return 1;
    if (!site.email) return 2;
    return 3;
  });
  const [values, setValues] = useState<Record<string, string>>({
    sitterName: site.sitterName || '', businessName: site.businessName || '', tagline: site.tagline || '', location: site.location || '',
    services: (site.services || []).join(', '), email: site.email || '', phone: site.phone || '', profileImageUrl: site.profileImageUrl || '',
    availabilityStatus: site.availabilityStatus || 'ACCEPTING', availabilityUntil: site.availabilityUntil || '', yearsExperience: site.yearsExperience?.toString() || ''
  });
  const [state, saveAction, isSaving] = useActionState<SaveProfileState, FormData>(saveProfileAction, {});
  const handledSave = useRef<number | undefined>(undefined);
  const step = onboardingSteps[stepIndex];

  const goToStep = (name: string) => {
    const nextIndex = onboardingSteps.findIndex((item) => item.name === name);
    if (nextIndex >= 0 && nextIndex <= stepIndex) setStepIndex(nextIndex);
  };

  const updateValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    if (!state.success || !state.savedAt || handledSave.current === state.savedAt) return;
    handledSave.current = state.savedAt;
    setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1));
  }, [state]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-medium uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Your site setup</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">A few details, then you&apos;re live.</h1></div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />Saved after every step</p>
      </div>
      <div className="mb-8 grid gap-4">{commercialStates.map((state) => <FoundingPlan key={state.businessId} state={state} />)}</div>
      {roverImportEnabled && <div className="mb-8 max-w-3xl"><RoverImportCard site={site.subdomain} /></div>}
      <Stepper value={step.name} onValueChange={goToStep} activationMode="manual" className="gap-10">
        <StepperList className="w-full overflow-x-auto pb-2" aria-label="Site setup progress">
          {onboardingSteps.map((item, index) => (
            <StepperItem key={item.name} value={item.name} completed={index < stepIndex} disabled={index > stepIndex} className="min-w-[9rem]">
              <StepperTrigger className="group flex min-w-0 items-center gap-3 text-left disabled:cursor-default">
                <StepperIndicator className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background text-sm font-semibold text-muted-foreground transition-colors group-data-[state=active]:border-emerald-600 group-data-[state=active]:bg-emerald-600 group-data-[state=active]:text-white group-data-[state=completed]:border-emerald-600 group-data-[state=completed]:bg-emerald-50 group-data-[state=completed]:text-emerald-700 dark:group-data-[state=completed]:bg-emerald-950">{index + 1}</StepperIndicator>
                <span className="hidden min-w-0 md:block"><StepperTitle className="block text-sm font-medium text-foreground">{item.label}</StepperTitle><StepperDescription className="mt-0.5 block text-xs text-muted-foreground">{item.description}</StepperDescription></span>
              </StepperTrigger>
              {index < onboardingSteps.length - 1 && <StepperSeparator className="mx-3 h-px flex-1 bg-border data-[state=completed]:bg-emerald-500" />}
            </StepperItem>
          ))}
        </StepperList>
        <div className="grid items-start gap-10 border-t border-border pt-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
          <main className="flex min-h-[470px] flex-col justify-center py-4">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">Step {stepIndex + 1} of {onboardingSteps.length} · {step.label}</p>
              <h2 className="text-4xl font-semibold tracking-[-.045em] sm:text-5xl lg:text-6xl">{step.title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{step.helper}</p>
              <form action={stepIndex === onboardingSteps.length - 1 ? completeOnboardingAction : saveAction} className="mt-9">
              <input type="hidden" name="subdomain" value={site.subdomain} />
              {step.name === 'photo' ? (
                <div className="rounded-xl border border-border bg-muted/20 p-5"><ProfileImageUpload subdomain={site.subdomain} currentImageUrl={values.profileImageUrl} onUploaded={(url) => setValues((current) => ({ ...current, profileImageUrl: url }))} /></div>
              ) : step.name === 'identity' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <OnboardingField autoFocus label="Your name" name="sitterName" value={values.sitterName} onChange={updateValue} placeholder="Jamie" />
                  <OnboardingField label="Business name" optional name="businessName" value={values.businessName} onChange={updateValue} placeholder="Happy Tails Pet Care" />
                </div>
              ) : step.name === 'care' ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <OnboardingField autoFocus className="sm:col-span-2" label="One-sentence introduction" name="tagline" value={values.tagline} onChange={updateValue} placeholder="Reliable visits for dogs and cats in Oak Park." maxLength={160} />
                  <OnboardingField label="Service area" name="location" value={values.location} onChange={updateValue} placeholder="Oak Park and nearby neighborhoods" />
                  <OnboardingField label="Services" name="services" value={values.services} onChange={updateValue} placeholder="Dog walking, drop-ins, overnight stays" hint="Separate services with commas." />
                  <div>
                    <label htmlFor="availabilityStatus" className="mb-2 block text-sm font-medium">Availability</label>
                    <select id="availabilityStatus" name="availabilityStatus" value={values.availabilityStatus} onChange={(event) => updateValue('availabilityStatus', event.target.value)} className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base">
                      <option value="ACCEPTING">Accepting inquiries</option><option value="LIMITED">Limited availability</option><option value="UNAVAILABLE">Currently unavailable</option>
                    </select>
                  </div>
                  {values.availabilityStatus === 'ACCEPTING'
                    ? <input type="hidden" name="availabilityUntil" value="" />
                    : <OnboardingField label={values.availabilityStatus === 'UNAVAILABLE' ? 'Unavailable until' : 'Limited until'} optional name="availabilityUntil" type="date" value={values.availabilityUntil} onChange={updateValue} placeholder="" />}
                  <OnboardingField label="Years of experience" optional name="yearsExperience" type="number" min={0} max={80} value={values.yearsExperience} onChange={updateValue} placeholder="5" />
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  <OnboardingField autoFocus label="Email" name="email" type="email" value={values.email} onChange={updateValue} placeholder="hello@example.com" />
                  <OnboardingField label="Phone" optional name="phone" type="tel" value={values.phone} onChange={updateValue} placeholder="(555) 123-4567" />
                </div>
              )}
              {state.error && <p role="alert" className="mt-3 text-sm text-destructive">{state.error}</p>}
              <div className="mt-7 flex items-center gap-3">
                {stepIndex > 0 && <Button type="button" variant="ghost" size="lg" onClick={() => setStepIndex((current) => current - 1)}><ArrowLeft aria-hidden="true" />Back</Button>}
                <Button type="submit" size="lg" disabled={isSaving || (step.name === 'identity' && !values.sitterName.trim() && !values.businessName.trim())}>{isSaving ? <><Spokes aria-hidden="true" />Saving...</> : stepIndex === onboardingSteps.length - 1 ? <>Finish my site <ArrowRight aria-hidden="true" /></> : <>Save and continue <ArrowRight aria-hidden="true" /></>}</Button>
              </div>
              <p className="mt-7 text-xs text-muted-foreground"><kbd className="mr-2 rounded border border-border bg-muted px-2 py-1 font-sans">Enter</kbd>Press Enter to continue</p>
            </form>
            </div>
          </main>
          <SitePreview site={site} values={values} />
        </div>
      </Stepper>
    </div>
  );
}

function OnboardingField({ label, optional = false, name, value, onChange, hint, className, ...inputProps }: { label: string; optional?: boolean; name: string; value: string; onChange: (name: string, value: string) => void; hint?: string; className?: string } & Omit<ComponentProps<'input'>, 'name' | 'value' | 'onChange'>) {
  return <div className={className}>
    <label htmlFor={name} className="mb-2 block text-sm font-medium">{label}{optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}</label>
    <input id={name} name={name} value={value} required={!optional} onChange={(event) => onChange(name, event.target.value)} className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base shadow-sm outline-none transition focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10" {...inputProps} />
    {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

function DashboardHeader() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-[-.025em] sm:text-4xl">Your pet-care business</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Manage your website and inquiries, or check how your business is performing.</p>
    </div>
  );
}

const profileSuggestions = {
  sitterName: ['Jamie', 'Sam', 'Alex', 'Taylor'],
  businessName: ['Happy Tails Pet Care', 'Paws & Whiskers', 'Neighborhood Pet Care', 'Home Sweet Home Pet Sitting', 'The Pet Nanny'],
  tagline: ['Reliable visits for dogs and cats in Oak Park.', 'In-home care that keeps your pet on their usual routine.', 'Daily walks and drop-in visits for busy pet owners.', 'A familiar sitter while you are away.']
} as const;

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function ProfileField({ label, name, defaultValue, className, formatPhone = false, ...inputProps }: { label: string; name: string; defaultValue: string; className?: string; formatPhone?: boolean } & Omit<ComponentProps<'input'>, 'defaultValue' | 'name'>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input id={name} name={name} defaultValue={formatPhone ? formatPhoneNumber(defaultValue) : defaultValue} onChange={formatPhone ? (event) => { event.currentTarget.value = formatPhoneNumber(event.currentTarget.value); } : undefined} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10" {...inputProps} />
    </div>
  );
}

function ProfileTextArea({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue: string; placeholder: string }) {
  return <div className="sm:col-span-2"><label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label><textarea id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} maxLength={500} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10" /></div>;
}

const profileEditorPanelVariants: Variants = {
  open: { height: 'auto', opacity: 1 },
  closed: { height: 0, opacity: 0 }
};

const profileEditorPanelTransition: Transition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1]
};

function ProfileEditorSection({ title, description, summary, icon: Icon, defaultOpen = false, children }: { title: string; description: string; summary: string; icon: LucideIcon; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion ? { duration: 0 } : profileEditorPanelTransition;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((current) => !current)} className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 sm:px-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Icon className="size-4.5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span></span>
        <span className="hidden max-w-48 truncate text-right text-xs text-muted-foreground sm:block">{summary}</span>
        <motion.span initial={false} animate={{ rotate: open ? 180 : 0 }} transition={transition} className="shrink-0 text-muted-foreground" aria-hidden="true"><ChevronDown className="size-4" /></motion.span>
      </button>
      <motion.div id={panelId} initial={false} animate={open ? 'open' : 'closed'} variants={profileEditorPanelVariants} transition={transition} className="overflow-hidden" aria-hidden={!open} inert={!open}>
        <div className="grid gap-4 border-t border-border bg-muted/10 p-4 sm:grid-cols-2 sm:p-5">{children}</div>
      </motion.div>
    </div>
  );
}

function ProfileEditor({ site, roverImportEnabled }: { site: SiteProfile; roverImportEnabled: boolean }) {
  const [state, saveAction, isSaving] = useActionState<SaveProfileState, FormData>(saveProfileAction, {});
  const [showSaved, setShowSaved] = useState(false);
  const formId = `profile-editor-${site.subdomain}`;

  useEffect(() => {
    if (!state.success || !state.savedAt) return;
    setShowSaved(true);
    const timer = window.setTimeout(() => setShowSaved(false), 2200);
    return () => window.clearTimeout(timer);
  }, [state.success, state.savedAt]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-xl font-semibold">Edit what pet owners see</h2><p className="mt-1 text-sm text-muted-foreground">Open a section, make your changes, then save once.</p></div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {roverImportEnabled && <Button asChild variant="outline" size="sm"><Link href={`/admin/import/rover?site=${encodeURIComponent(site.subdomain)}`}>Import from Rover</Link></Button>}
            <Button type="submit" form={formId} size="sm" disabled={isSaving} className={`min-w-28 ${showSaved ? 'bg-emerald-600 text-white hover:bg-emerald-600' : ''}`}>{isSaving ? <><Spokes aria-hidden="true" />Saving...</> : showSaved ? <><Check aria-hidden="true" />Saved</> : 'Save changes'}</Button>
          </div>
          {state.error && <p role="alert" className="max-w-sm text-xs text-destructive sm:text-right">{state.error}</p>}
        </div>
      </div>
      <form id={formId} action={saveAction} className="rounded-xl bg-card p-2 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-24px_rgba(0,0,0,.35)] sm:p-3">
        <input type="hidden" name="subdomain" value={site.subdomain} />
        <div className="space-y-2">
          <ProfileEditorSection title="Profile basics" description="The first details pet owners see." summary="Name, intro, and service area" icon={Users} defaultOpen>
            <SuggestionField label="Your name" name="sitterName" defaultValue={site.sitterName || ''} placeholder="Jamie" suggestions={profileSuggestions.sitterName} hint="The name pet owners will see first." />
            <SuggestionField label="Business name" name="businessName" defaultValue={site.businessName || ''} placeholder="Happy Tails Pet Care" suggestions={profileSuggestions.businessName} hint="Choose a suggestion or type your own." />
            <SuggestionField className="sm:col-span-2" label="One-sentence introduction" name="tagline" defaultValue={site.tagline || ''} placeholder="Reliable care for pets nearby." suggestions={profileSuggestions.tagline} hint="Choose a starting point or write your own." />
            <ServiceAreaField className="sm:col-span-2" defaultValue={site.location || ''} />
          </ProfileEditorSection>

          <ProfileEditorSection title="Services and pricing" description="Choose what you offer, then describe each service." summary="Services, descriptions, and starting prices" icon={PawPrint}>
            <ServicesField className="sm:col-span-2" defaultValue={site.services || []} />
            <ProfileServiceFields site={site} />
          </ProfileEditorSection>

          <ProfileEditorSection title="Care and experience" description="Help clients understand your routine and fit." summary="Routine, experience, and expectations" icon={HeartHandshake}>
            <ProfileField label="Years of experience (self-reported)" name="yearsExperience" type="number" min={0} max={80} defaultValue={site.yearsExperience?.toString() || ''} placeholder="5" />
            <ProfileField label="Care capabilities (comma separated)" name="careCapabilities" defaultValue={(site.careCapabilities || []).join(', ')} placeholder="Senior pets, medication, puppies" />
            <ProfileCareFields site={site} />
            <ProfileTextArea label="Meet-and-greet expectations" name="meetAndGreetExpectations" defaultValue={site.meetAndGreetExpectations || ''} placeholder="Share what a new client should expect before care begins." />
            <ProfileTextArea label="Cancellation expectations" name="cancellationExpectations" defaultValue={site.cancellationExpectations || ''} placeholder="Explain your usual notice and cancellation expectations." />
            <ProfileField label="Self-reported credentials (comma separated)" name="selfReportedCredentials" defaultValue={(site.selfReportedCredentials || []).join(', ')} placeholder="Pet first aid course, insured" className="sm:col-span-2" />
          </ProfileEditorSection>

          <ProfileEditorSection title="Availability and contact" description="Set your current status and how clients reach you." summary="Availability, email, phone, and LinkedIn" icon={Mail}>
            <div><label htmlFor="availabilityStatus-editor" className="mb-1.5 block text-xs font-medium text-muted-foreground">Availability</label><select id="availabilityStatus-editor" name="availabilityStatus" defaultValue={site.availabilityStatus || 'ACCEPTING'} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="ACCEPTING">Accepting inquiries</option><option value="LIMITED">Limited availability</option><option value="UNAVAILABLE">Currently unavailable</option></select></div>
            <ProfileField label="Unavailable or limited until (optional)" name="availabilityUntil" type="date" defaultValue={site.availabilityUntil || ''} placeholder="" />
            <ProfileField label="Email" name="email" type="email" defaultValue={site.email || ''} placeholder="hello@example.com" />
            <ProfileField label="Phone" name="phone" type="tel" inputMode="tel" formatPhone defaultValue={site.phone || ''} placeholder="(555) 123-4567" />
            <ProfileField className="sm:col-span-2" label="LinkedIn profile (optional)" name="linkedinUrl" type="url" inputMode="url" maxLength={500} defaultValue={site.linkedinUrl || ''} placeholder="https://www.linkedin.com/in/your-name" />
          </ProfileEditorSection>

          <ProfileEditorSection title="Profile photo" description="Add a clear, recent photo to build recognition." summary={site.profileImageUrl ? 'Photo added' : 'No photo yet'} icon={Camera}>
            <div className="sm:col-span-2"><ProfileImageUpload subdomain={site.subdomain} currentImageUrl={site.profileImageUrl} /></div>
          </ProfileEditorSection>
        </div>
        <div className="mt-2 flex min-h-14 items-center justify-between gap-4 rounded-lg bg-muted/30 px-4 py-3 sm:px-5">
          <p role={state.error ? undefined : 'status'} className={`text-xs transition-opacity ${state.error ? 'text-destructive' : 'text-muted-foreground'} ${state.error || showSaved ? 'opacity-100' : 'opacity-0'}`}>
            {state.error || (showSaved ? 'Your public site is up to date.' : 'Changes saved.')}
          </p>
          <Button type="submit" size="sm" disabled={isSaving} className={`min-w-28 overflow-hidden transition-colors ${showSaved ? 'bg-emerald-600 text-white hover:bg-emerald-600' : ''}`}>
            {isSaving ? <><Spokes aria-hidden="true" />Saving...</> : showSaved ? <><span className="grid size-5 animate-in place-items-center rounded-full bg-white/20 zoom-in-50 duration-300"><Check aria-hidden="true" className="size-3.5 stroke-[3]" /></span>Saved</> : 'Save changes'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function SiteEditor({ sites, roverImportEnabled }: { sites: SiteProfile[]; roverImportEnabled: boolean }) {
  const [selectedSubdomain, setSelectedSubdomain] = useState(sites[0]?.subdomain || '');
  const selected = sites.find((site) => site.subdomain === selectedSubdomain) || sites[0];
  if (!selected) return null;
  const options = editableSiteOptions(sites);
  return <section id="site-editor" className="space-y-4">
    {sites.length > 1 && <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><label htmlFor="site-editor-select" className="text-sm font-semibold">Site to edit</label><p className="mt-1 text-xs text-muted-foreground">Choose any owned Site. Saving changes only this Site.</p></div><select id="site-editor-select" value={selected.subdomain} onChange={(event) => setSelectedSubdomain(event.target.value)} className="h-11 min-w-56 rounded-lg border border-input bg-background px-3 text-sm">{options.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.value}</option>)}</select></div>}
    <ProfileEditor key={selected.subdomain} site={selected} roverImportEnabled={roverImportEnabled} />
  </section>;
}

function SiteGrid({
  sites,
  action,
  isPending
}: {
  sites: SiteProfile[];
  action: (formData: FormData) => void;
  isPending: boolean;
}) {
  if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe2 className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">You haven&apos;t created a site yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Choose a web address on the home page to get started.</p>
          <Button asChild className="mt-5"><Link href="/">Create my site</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-2 lg:max-w-none">
      {sites.map((site) => (
        <Card key={site.subdomain} className="group relative flex-row items-center gap-3 overflow-hidden rounded-xl p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30">
          <a
            href={`${protocol}://${site.subdomain}.${rootDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus:outline-none"
            aria-label={`Open ${site.businessName || site.sitterName || site.subdomain} site`}
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-emerald-700 transition-colors group-hover:bg-accent dark:text-emerald-400"><PetIcon value={site.emoji} className="size-6" fallbackClassName="text-2xl" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" /><p className="truncate text-sm font-semibold">{site.businessName || site.sitterName || site.subdomain}</p></div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">{site.subdomain}.{rootDomain}<ExternalLink aria-hidden="true" className="size-3 opacity-0 transition-opacity group-hover:opacity-100" /></p>
            </div>
          </a>
          <div className="flex shrink-0 items-center gap-1">
            <ShareSiteButton url={`${protocol}://${site.subdomain}.${rootDomain}`} name={site.businessName || site.sitterName || site.subdomain} />
              <DeleteSiteDialog
                subdomain={site.subdomain}
                siteUrl={`${site.subdomain}.${rootDomain}`}
                action={action}
                isPending={isPending}
              />
          </div>
        </Card>
      ))}
    </div>
  );
}

type PaymentSetup = { businessId: string; businessName: string; connected: boolean; ready: boolean; status: ConnectedAccountStatus };

const paymentSetupContent = {
  not_started: { title: 'Set up Stripe', detail: 'Add your identity and bank details securely with Stripe.', button: 'Start Stripe setup', icon: CreditCard, tone: 'text-muted-foreground bg-muted' },
  action_required: { title: 'More information needed', detail: 'Stripe needs a few details to activate or keep your payment account in good standing.', button: 'Finish Stripe setup', icon: CircleAlert, tone: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950' },
  pending: { title: 'Stripe is reviewing your details', detail: "Nothing else is needed right now. We'll check again whenever you open this dashboard.", button: '', icon: Clock3, tone: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950' },
  ready: { title: 'Ready to accept payments', detail: 'Stripe is connected. Pet owners can choose an amount on your public site, and you can also send payment requests from inquiries.', button: '', icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950' },
  reconnect_required: { title: 'Reconnect Stripe', detail: 'This payment account belongs to a different Stripe sandbox. Reconnect it to continue with the current Sitterfolio sandbox.', button: 'Reconnect Stripe', icon: CircleAlert, tone: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950' },
  unavailable: { title: 'Status could not be refreshed', detail: 'Your Stripe details are safe. Try refreshing this page in a moment.', button: '', icon: RotateCw, tone: 'text-muted-foreground bg-muted' },
} as const;

function StripeOnboardingButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending} aria-disabled={pending}>
    {pending ? <><Spokes aria-hidden="true" />Opening Stripe...</> : label}
  </Button>;
}

function StripeBusinessStatus({ business }: { business: PaymentSetup }) {
  const initialState: RefreshStripeStatusState = { status: business.status, ready: business.ready };
  const [refreshState, refreshAction, isRefreshing] = useActionState(refreshStripeStatusAction, initialState);
  const status = refreshState.status ?? business.status;
  const content = paymentSetupContent[status];
  const Icon = content.icon;
  const canManage = status === 'pending' || status === 'ready';
  const canRefresh = status !== 'not_started' && status !== 'reconnect_required';

  return <div className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${content.tone}`}>{isRefreshing ? <Spokes className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}</span>
      <div>
        <p className="font-medium">{business.businessName}</p>
        <p className="mt-0.5 text-sm font-medium">{isRefreshing ? 'Checking Stripe status...' : content.title}</p>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{content.detail}</p>
        {refreshState.error ? <div aria-live="polite" className="mt-1 text-xs text-destructive">{refreshState.error}</div> : null}
      </div>
    </div>
    <div className="flex shrink-0 flex-col gap-1 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {content.button && <form action={startStripeOnboardingAction}><input type="hidden" name="businessId" value={business.businessId} /><StripeOnboardingButton label={content.button} /></form>}
        {canManage && <Button asChild size="sm" variant="outline"><a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">Manage in Stripe <ExternalLink aria-hidden="true" /></a></Button>}
        {canRefresh && <form action={refreshAction}><input type="hidden" name="businessId" value={business.businessId} /><Button type="submit" size="sm" variant="outline" disabled={isRefreshing}>{isRefreshing ? <><Spokes aria-hidden="true" />Checking...</> : <><RotateCw aria-hidden="true" />Refresh status</>}</Button></form>}
      </div>
      <div aria-live="polite" className="text-xs text-muted-foreground sm:text-right">
        {refreshState.refreshedAt && !refreshState.error ? 'Status refreshed just now.' : null}
      </div>
    </div>
  </div>;
}

function StripeSetup({ businesses, stripeReturn }: { businesses: PaymentSetup[]; stripeReturn?: string }) {
  const isReady = businesses.every((business) => business.status === 'ready');
  const returnedBusiness = businesses.find((business) => business.status !== 'ready') ?? businesses[0];
  const returnMessage = stripeReturn === 'error'
    ? 'We could not reopen Stripe setup. Please try again.'
    : stripeReturn === 'returned' && returnedBusiness?.status === 'pending'
      ? 'Your details were submitted. Stripe is reviewing them; you do not need to enter them again.'
      : stripeReturn === 'returned' && returnedBusiness?.status === 'ready'
        ? 'Stripe is connected. You can now send payment requests.'
        : stripeReturn === 'returned'
          ? "You're back from Stripe, but a few details still need attention."
          : null;

  return (
    <section id="stripe-setup" className={`rounded-xl bg-card ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-24px_rgba(0,0,0,.35)] ${isReady ? 'p-5 sm:p-6' : 'p-4 sm:p-5'}`}>
      <div className="flex items-start gap-3">
        <span className={`grid shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 ${isReady ? 'size-10' : 'size-9'}`}><CreditCard className={isReady ? 'size-5' : 'size-4'} aria-hidden="true" /></span>
        <div>
          <h2 className="font-semibold">{isReady ? 'Payments with Stripe' : 'Connect Stripe to receive payments'}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{isReady ? 'Stripe is connected and ready for payment requests.' : 'Set up secure payments and payouts through Stripe.'}</p>
        </div>
      </div>
      {returnMessage && <div role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm ${stripeReturn === 'error' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'}`}>{returnMessage}</div>}
      <div className="mt-5 grid gap-3">
        {businesses.map((business) => <StripeBusinessStatus key={business.businessId} business={business} />)}
      </div>
    </section>
  );
}

export function AdminDashboard({ sites, leads, conversationMessages, clientHouseholds, bookings, testimonials, revenue, paymentSetup, growthActivation, commercialStates, stripeReturn, roverImportEnabled }: { sites: SiteProfile[]; leads: import('@/lib/profile-ownership').OwnedLead[]; conversationMessages: Record<string, import('@/lib/conversations').ConversationMessage[]>; clientHouseholds: ClientHousehold[]; bookings: Booking[]; testimonials: Testimonial[]; revenue: RevenueSnapshot; paymentSetup: PaymentSetup[]; growthActivation: OwnerGrowthActivation; commercialStates: BusinessCommercialState[]; stripeReturn?: string; roverImportEnabled: boolean }) {
  const [state, action, isPending] = useActionState<DeleteState, FormData>(
    deleteSubdomainAction,
    {}
  );
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bookingDraft, setBookingDraft] = useState<ReviewedBookingDraft | null>(null);
  const clientHouseholdByLead = Object.fromEntries(clientHouseholds.map((household) => [household.sourceLeadId, household.id]));
  const activationItems = activationChecklist({ sites, leads, conversationMessages, paymentSetup, clientHouseholds, bookings, growthActivation });
  const nextActivation = nextActivationItem(activationItems);

  function createDraftBooking(leadId: string, householdId: string) {
    const lead = leads.find((item) => item.id === leadId);
    const household = clientHouseholds.find((item) => item.id === householdId);
    if (!lead || !household) return;
    const draft = reviewedBookingDraft(lead, household);
    if (!draft) return;
    setBookingDraft(draft);
    setActiveTab('bookings');
  }

  const onboardingSite = sites.find((site) => site.onboardingCompletedAt === null);
  if (onboardingSite) return <ProfileOnboarding site={onboardingSite} commercialStates={commercialStates} roverImportEnabled={roverImportEnabled} />;

  return (
    <div className="relative mx-auto w-full max-w-6xl px-5 pb-12 pt-8 lg:px-8 lg:pb-16 lg:pt-12">
      <DashboardHeader />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-7">
        <TabsList aria-label="Dashboard views">
          <TabsTrigger value="dashboard"><LayoutDashboard className="size-4" aria-hidden="true" />Dashboard</TabsTrigger>
          <TabsTrigger value="stats"><ChartNoAxesCombined className="size-4" aria-hidden="true" />Stats</TabsTrigger>
          <TabsTrigger value="messages"><MessageCircle className="size-4" aria-hidden="true" />Messages</TabsTrigger>
          <TabsTrigger value="clients"><Users className="size-4" aria-hidden="true" />Clients</TabsTrigger>
          <TabsTrigger value="bookings"><CalendarDays className="size-4" aria-hidden="true" />Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" forceMount className="space-y-12 pt-8 data-[state=inactive]:hidden">
          <div className="grid gap-4">{commercialStates.map((state) => <FoundingPlan key={state.businessId} state={state} />)}</div>
          <ActivationChecklist items={activationItems} next={nextActivation} onOpenTab={setActiveTab} />
          <section id="requests" className="space-y-4"><div><h2 className="text-xl font-semibold">Requests</h2><p className="mt-1 text-sm text-muted-foreground">Read and reply to pet owners in one place.</p></div><LeadInbox sites={sites} leads={leads} conversationMessages={conversationMessages} clientHouseholdByLead={clientHouseholdByLead} onCreateDraftBooking={createDraftBooking} /></section>
          <section id="share-site" className="scroll-mt-24 space-y-4"><div><h2 className="text-xl font-semibold">Share your site</h2><p className="mt-1 text-sm text-muted-foreground">Preview each live site or copy its link to send to a pet owner.</p></div><SiteGrid sites={sites} action={action} isPending={isPending} /></section>
          {paymentSetup.some((business) => business.status !== 'ready') && <StripeSetup businesses={paymentSetup} stripeReturn={stripeReturn} />}
          <SiteEditor sites={sites} roverImportEnabled={roverImportEnabled} />
          <Testimonials sites={sites.map((site) => ({ subdomain: site.subdomain, name: site.businessName || site.sitterName || site.subdomain }))} testimonials={testimonials} />
          {paymentSetup.length > 0 && paymentSetup.every((business) => business.status === 'ready') && <StripeSetup businesses={paymentSetup} stripeReturn={stripeReturn} />}
        </TabsContent>
        <TabsContent value="stats" forceMount className="pt-8 data-[state=inactive]:hidden">
          <BusinessPulse revenue={revenue} />
        </TabsContent>
        <TabsContent value="messages" forceMount className="pt-8 data-[state=inactive]:hidden">
          <div className="mb-5"><h2 className="text-xl font-semibold">Messages</h2><p className="mt-1 text-sm text-muted-foreground">Continue private conversations with pet owners across all your sites.</p></div>
          <MessagesInbox leads={leads} conversationMessages={conversationMessages} />
        </TabsContent>
        <TabsContent value="clients" forceMount className="pt-8 data-[state=inactive]:hidden">
          <div className="mb-5"><h2 className="text-xl font-semibold">Clients and pets</h2><p className="mt-1 text-sm text-muted-foreground">Reusable household and pet details saved from qualified inquiries.</p></div>
          <ClientHouseholds households={clientHouseholds} />
        </TabsContent>
        <TabsContent value="bookings" forceMount className="scroll-mt-24 pt-8 data-[state=inactive]:hidden" id="bookings">
          <div className="mb-5"><h2 className="text-xl font-semibold">Bookings</h2><p className="mt-1 text-sm text-muted-foreground">Plan care for saved clients and keep each booking status current.</p></div>
          <Bookings households={clientHouseholds} bookings={bookings} draft={bookingDraft} />
        </TabsContent>
      </Tabs>

      {state.error && (
        <div role="alert" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-[0_16px_40px_-20px_rgba(0,0,0,.45)] dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-[0_16px_40px_-20px_rgba(0,0,0,.45)] dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {state.success}
        </div>
      )}
    </div>
  );
}
