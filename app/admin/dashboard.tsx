'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ExternalLink, Globe2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteSubdomainAction } from '@/app/actions';
import { rootDomain, protocol } from '@/lib/utils';
import { saveProfileAction, type SaveProfileState } from '@/app/actions';
import { completeOnboardingAction } from '@/app/actions';
import { ProfileImageUpload } from './profile-image-upload';
import { ShareSiteButton } from './share-site-button';
import { DeleteSiteDialog } from './delete-site-dialog';
import { PetIcon } from '@/components/pet-icon';
import { ServiceAreaField, ServicesField, SuggestionField } from './profile-select-fields';
import { LeadInbox } from './lead-inbox';

type Tenant = {
  subdomain: string;
  emoji: string;
  createdAt: number;
  businessName?: string;
  tagline?: string;
  location?: string;
  services?: string[];
  phone?: string;
  email?: string;
  profileImageUrl?: string;
  onboardingCompletedAt?: number | null;
};

type DeleteState = {
  error?: string;
  success?: string;
};

const onboardingSteps = [
  { name: 'businessName', title: 'What should pet owners call your business?', helper: 'Use the name clients already recognize.', placeholder: 'Happy Tails Pet Care', required: true },
  { name: 'tagline', title: 'How would you describe your care?', helper: 'Write one warm sentence that helps a pet owner understand what makes you different.', placeholder: 'Kind, reliable care for your favorite family members.', required: true },
  { name: 'location', title: 'Where do you care for pets?', helper: 'Name the neighborhood, city, or area you serve.', placeholder: 'Oak Park and nearby neighborhoods', required: true },
  { name: 'services', title: 'Which services do you offer?', helper: 'Separate each service with a comma. You can add up to eight.', placeholder: 'Dog walking, Drop-in visits, Overnight stays', required: true },
  { name: 'email', title: 'Where should pet owners email you?', helper: 'This will appear on your site so interested clients can reach you directly.', placeholder: 'hello@example.com', type: 'email', required: true },
  { name: 'phone', title: 'Would you like to share a phone number?', helper: 'This is optional. You can leave it blank and continue.', placeholder: '(555) 123-4567', type: 'tel', required: false },
  { name: 'profileImageUrl', title: 'Add a friendly profile photo', helper: 'A clear photo helps pet owners feel like they already know you.', placeholder: '', required: false }
] as const;

function SitePreview({ tenant, values }: { tenant: Tenant; values: Record<string, string> }) {
  const services = values.services.split(',').map((service) => service.trim()).filter(Boolean);
  return (
    <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,.3)] lg:sticky lg:top-24">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-400" /><span className="size-2.5 rounded-full bg-amber-400" /><span className="size-2.5 rounded-full bg-emerald-500" />
        <div className="ml-2 min-w-0 flex-1 truncate rounded-full bg-background px-4 py-2 text-center text-xs text-muted-foreground">{tenant.subdomain}.{rootDomain}</div>
      </div>
      <div className="min-h-[440px] p-7 text-center sm:p-9">
        <div className="mx-auto grid size-20 place-items-center overflow-hidden rounded-full border-4 border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {values.profileImageUrl ? <img src={values.profileImageUrl} alt="Profile preview" className="size-full object-cover" /> : <PetIcon value={tenant.emoji} className="size-10" fallbackClassName="text-4xl" />}
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-300">{values.businessName || 'Your business name'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{values.location || `${tenant.subdomain}.${rootDomain}`}</p>
        <div className="mx-auto mt-7 h-28 max-w-sm rounded-xl bg-muted/70" />
        <p className="mx-auto mt-6 max-w-sm text-sm leading-6 text-muted-foreground">{values.tagline || 'Your introduction will appear here.'}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {(services.length ? services : ['Your services']).slice(0, 3).map((service) => <span key={service} className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">{service}</span>)}
        </div>
      </div>
    </aside>
  );
}

export function OnboardingComplete({ tenant }: { tenant: Tenant }) {
  const siteUrl = `${protocol}://${tenant.subdomain}.${rootDomain}`;
  useEffect(() => {
    window.localStorage.removeItem('sitterfolio-draft');
  }, []);
  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-2xl items-center justify-center px-4 py-12 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="size-8" aria-hidden="true" /></span>
        <h1 className="mt-7 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Your Sitterfolio is ready.</h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-muted-foreground">Take a look at your live site, then share it with pet owners whenever you’re ready.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg"><a href={siteUrl} target="_blank" rel="noopener noreferrer">View live site <ExternalLink aria-hidden="true" /></a></Button>
          <Button asChild size="lg" variant="outline"><Link href="/admin">Go to dashboard</Link></Button>
        </div>
      </div>
    </div>
  );
}

function ProfileOnboarding({ tenant }: { tenant: Tenant }) {
  const [stepIndex, setStepIndex] = useState(() => {
    if (!tenant.businessName) return 0;
    if (!tenant.tagline) return 1;
    if (!tenant.location) return 2;
    if (!tenant.services?.length) return 3;
    if (!tenant.email) return 4;
    if (!tenant.phone) return 5;
    return 6;
  });
  const [values, setValues] = useState<Record<string, string>>({
    businessName: tenant.businessName || '', tagline: tenant.tagline || '', location: tenant.location || '',
    services: (tenant.services || []).join(', '), email: tenant.email || '', phone: tenant.phone || '', profileImageUrl: tenant.profileImageUrl || ''
  });
  const [state, saveAction, isSaving] = useActionState<SaveProfileState, FormData>(saveProfileAction, {});
  const handledSave = useRef<number | undefined>(undefined);
  const step = onboardingSteps[stepIndex];

  useEffect(() => {
    if (!state.success || !state.savedAt || handledSave.current === state.savedAt) return;
    handledSave.current = state.savedAt;
    setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1));
  }, [state]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="mb-8 lg:max-w-[calc(100%-28rem)]">
        <div className="flex items-end justify-between gap-4"><h1 className="text-lg font-semibold">Build your Sitterfolio</h1><span className="text-sm text-muted-foreground">{stepIndex + 1} of {onboardingSteps.length}</span></div>
        <div className="mt-4 grid grid-cols-7 gap-2" aria-label={`Step ${stepIndex + 1} of ${onboardingSteps.length}`}>{onboardingSteps.map((item, index) => <span key={item.name} className={`h-1.5 rounded-full transition-colors ${index <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />)}</div>
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />Your site is saved as you go.</p>
      </div>
      <div className="grid items-start gap-10 border-t border-border pt-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
        <main className="flex min-h-[470px] flex-col justify-center py-4">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold tracking-[-.045em] sm:text-5xl lg:text-6xl">{step.title}</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">{step.helper}</p>
            <form action={stepIndex === onboardingSteps.length - 1 ? completeOnboardingAction : saveAction} className="mt-9">
              <input type="hidden" name="subdomain" value={tenant.subdomain} />
              {step.name === 'profileImageUrl' ? (
                <div className="rounded-xl border border-border bg-muted/20 p-5"><ProfileImageUpload subdomain={tenant.subdomain} currentImageUrl={values.profileImageUrl} onUploaded={(url) => setValues((current) => ({ ...current, profileImageUrl: url }))} /></div>
              ) : (
                <input autoFocus id={step.name} name={step.name} type={'type' in step ? step.type : 'text'} required={step.required} value={values[step.name]} onChange={(event) => setValues((current) => ({ ...current, [step.name]: event.target.value }))} placeholder={step.placeholder} className="h-16 w-full rounded-xl border border-input bg-background px-5 text-lg shadow-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15" />
              )}
              {state.error && <p role="alert" className="mt-3 text-sm text-destructive">{state.error}</p>}
              <div className="mt-7 flex items-center gap-3">
                {stepIndex > 0 && <Button type="button" variant="ghost" size="lg" onClick={() => setStepIndex((current) => current - 1)}><ArrowLeft aria-hidden="true" />Back</Button>}
                <Button type="submit" size="lg" disabled={isSaving}>{isSaving ? <><Loader2 className="animate-spin" aria-hidden="true" />Saving…</> : stepIndex === onboardingSteps.length - 1 ? <>Finish my site <ArrowRight aria-hidden="true" /></> : <>Continue <ArrowRight aria-hidden="true" /></>}</Button>
              </div>
              <p className="mt-7 text-xs text-muted-foreground"><kbd className="mr-2 rounded border border-border bg-muted px-2 py-1 font-sans">Enter</kbd>Press Enter to continue</p>
            </form>
          </div>
        </main>
        <SitePreview tenant={tenant} values={values} />
      </div>
    </div>
  );
}

function DashboardHeader() {
  // TODO: You can add authentication here with your preferred auth provider

  return (
    <div className="border-b border-border pb-7">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-400">Sitter dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">Your pet-care website</h1>
        <p className="mt-2 text-sm text-muted-foreground">Update what pet owners see, share your site, and review new inquiries.</p>
      </div>
    </div>
  );
}

const profileSuggestions = {
  businessName: ['Happy Tails Pet Care', 'Paws & Whiskers', 'Neighborhood Pet Care', 'Home Sweet Home Pet Sitting', 'The Pet Nanny'],
  tagline: ['Kind, reliable care for your favorite family members.', 'Trusted care that keeps pets happy at home.', 'Personalized care for every paw, feather, and whisker.', 'A familiar face while you’re away.']
} as const;

function ProfileField({ label, name, defaultValue, placeholder, type = 'text', className }: { label: string; name: string; defaultValue: string; placeholder: string; type?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10" />
    </div>
  );
}

function ProfileEditor({ tenant }: { tenant: Tenant }) {
  const [state, saveAction, isSaving] = useActionState<SaveProfileState, FormData>(saveProfileAction, {});
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!state.success || !state.savedAt) return;
    setShowSaved(true);
    const timer = window.setTimeout(() => setShowSaved(false), 2200);
    return () => window.clearTimeout(timer);
  }, [state.success, state.savedAt]);

  return (
    <section className="space-y-3">
      <div><h2 className="text-xl font-semibold">Edit what pet owners see</h2><p className="mt-1 text-sm text-muted-foreground">Keep the essentials current. Changes appear after you save.</p></div>
      <form action={saveAction} className="rounded-xl border border-border bg-card shadow-sm">
        <input type="hidden" name="subdomain" value={tenant.subdomain} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <SuggestionField label="Business name" name="businessName" defaultValue={tenant.businessName || ''} placeholder="Happy Tails Pet Care" suggestions={profileSuggestions.businessName} hint="Choose a suggestion or type your own." />
          <SuggestionField label="One-sentence introduction" name="tagline" defaultValue={tenant.tagline || ''} placeholder="Reliable care for pets nearby." suggestions={profileSuggestions.tagline} hint="Choose a starting point or write your own." />
          <ServiceAreaField defaultValue={tenant.location || ''} />
          <ServicesField defaultValue={tenant.services || []} />
          <ProfileField label="Phone" name="phone" type="tel" defaultValue={tenant.phone || ''} placeholder="(555) 123-4567" />
          <ProfileField label="Email" name="email" type="email" defaultValue={tenant.email || ''} placeholder="hello@example.com" />
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Profile photo</p>
            <ProfileImageUpload subdomain={tenant.subdomain} currentImageUrl={tenant.profileImageUrl} />
          </div>
        </div>
        <div className="flex min-h-14 items-center justify-between gap-4 border-t border-border bg-muted/20 px-5 py-3">
          <p role="status" className={`text-xs transition-opacity ${state.error ? 'text-destructive' : 'text-muted-foreground'} ${state.error || showSaved ? 'opacity-100' : 'opacity-0'}`}>
            {state.error || (showSaved ? 'Your public site is up to date.' : 'Changes saved.')}
          </p>
          <Button type="submit" size="sm" disabled={isSaving} className={`min-w-28 overflow-hidden transition-colors ${showSaved ? 'bg-emerald-600 text-white hover:bg-emerald-600' : ''}`}>
            {isSaving ? <><Loader2 aria-hidden="true" className="animate-spin" />Saving…</> : showSaved ? <><span className="grid size-5 animate-in place-items-center rounded-full bg-white/20 zoom-in-50 duration-300"><Check aria-hidden="true" className="size-3.5 stroke-[3]" /></span>Saved</> : 'Save changes'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function TenantGrid({
  tenants,
  action,
  isPending
}: {
  tenants: Tenant[];
  action: (formData: FormData) => void;
  isPending: boolean;
}) {
  if (tenants.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe2 className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">You haven’t created a site yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Choose a web address on the home page to get started.</p>
          <Button asChild className="mt-5"><Link href="/">Create my site</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-2 lg:max-w-none">
      {tenants.map((tenant) => (
        <Card key={tenant.subdomain} className="group relative flex-row items-center gap-3 overflow-hidden rounded-xl p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-emerald-700 transition-colors group-hover:bg-accent dark:text-emerald-400"><PetIcon value={tenant.emoji} className="size-6" fallbackClassName="text-2xl" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" /><p className="truncate text-sm font-semibold">{tenant.businessName || tenant.subdomain}</p></div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">{tenant.subdomain}.{rootDomain}<ExternalLink aria-hidden="true" className="size-3 opacity-0 transition-opacity group-hover:opacity-100" /></p>
          </div>
          <a
            href={`${protocol}://${tenant.subdomain}.${rootDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 rounded-xl focus:outline-none"
            aria-label={`Open ${tenant.businessName || tenant.subdomain} site`}
          />
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            <ShareSiteButton url={`${protocol}://${tenant.subdomain}.${rootDomain}`} name={tenant.businessName || tenant.subdomain} />
              <DeleteSiteDialog
                subdomain={tenant.subdomain}
                siteUrl={`${tenant.subdomain}.${rootDomain}`}
                action={action}
                isPending={isPending}
              />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function AdminDashboard({ tenants, leads }: { tenants: Tenant[]; leads: { id: string; subdomain: string; siteName: string; name: string; email: string; dates: string; message: string; createdAt: number; readAt: number | null }[] }) {
  const [state, action, isPending] = useActionState<DeleteState, FormData>(
    deleteSubdomainAction,
    {}
  );

  const onboardingTenant = tenants.find((tenant) => tenant.onboardingCompletedAt === null);
  if (onboardingTenant) return <ProfileOnboarding tenant={onboardingTenant} />;

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-12 px-5 pb-12 pt-8 lg:px-8 lg:pb-16 lg:pt-12">
      <DashboardHeader />
      <section className="space-y-4"><div><h2 className="text-xl font-semibold">Share your site</h2><p className="mt-1 text-sm text-muted-foreground">Preview each live site or copy its link to send to a pet owner.</p></div><TenantGrid tenants={tenants} action={action} isPending={isPending} /></section>
      {tenants[0] && <ProfileEditor tenant={tenants[0]} />}
      <section className="space-y-4"><div><h2 className="text-xl font-semibold">Recent inquiries</h2><p className="mt-1 text-sm text-muted-foreground">Messages pet owners sent through your Sites.</p></div><LeadInbox leads={leads} /></section>

      {state.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          {state.success}
        </div>
      )}
    </div>
  );
}
