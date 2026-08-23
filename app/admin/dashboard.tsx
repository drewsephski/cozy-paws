'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Clock3, CreditCard, ExternalLink, Globe2, Loader2, RotateCw } from 'lucide-react';
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

type SiteProfile = {
  subdomain: string;
  emoji: string;
  createdAt: number;
  sitterName?: string;
  businessName?: string;
  tagline?: string;
  location?: string;
  services?: string[];
  phone?: string;
  email?: string;
  profileImageUrl?: string;
  onboardingCompletedAt?: number | null;
  paymentLinkUrl?: string;
};

type DeleteState = {
  error?: string;
  success?: string;
};

const onboardingSteps = [
  { name: 'identity', title: 'Who will pet owners be contacting?', helper: 'Add your name, a business name, or both. At least one is required.', placeholder: '', required: true },
  { name: 'tagline', title: 'How would you describe your care?', helper: 'Write one sentence about the care clients can expect from you.', placeholder: 'Reliable visits for dogs and cats in Oak Park.', required: true },
  { name: 'location', title: 'Where do you care for pets?', helper: 'Name the neighborhood, city, or area you serve.', placeholder: 'Oak Park and nearby neighborhoods', required: true },
  { name: 'services', title: 'Which services do you offer?', helper: 'Separate each service with a comma. You can add up to eight.', placeholder: 'Dog walking, Drop-in visits, Overnight stays', required: true },
  { name: 'email', title: 'Where should pet owners email you?', helper: 'Clients can reply here, and new inquiry alerts will be sent to this address.', placeholder: 'hello@example.com', type: 'email', required: true },
  { name: 'phone', title: 'Do you want to share a phone number?', helper: 'Optional. Leave this blank if you prefer email.', placeholder: '(555) 123-4567', type: 'tel', required: false },
  { name: 'profileImageUrl', title: 'Add a profile photo', helper: 'Use a clear, recent photo of yourself.', placeholder: '', required: false }
] as const;

function SitePreview({ site, values }: { site: SiteProfile; values: Record<string, string> }) {
  const services = values.services.split(',').map((service) => service.trim()).filter(Boolean);
  return (
    <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,.3)] lg:sticky lg:top-24">
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

function ProfileOnboarding({ site }: { site: SiteProfile }) {
  const [stepIndex, setStepIndex] = useState(() => {
    if (!site.sitterName && !site.businessName) return 0;
    if (!site.tagline) return 1;
    if (!site.location) return 2;
    if (!site.services?.length) return 3;
    if (!site.email) return 4;
    if (!site.phone) return 5;
    return 6;
  });
  const [values, setValues] = useState<Record<string, string>>({
    sitterName: site.sitterName || '', businessName: site.businessName || '', tagline: site.tagline || '', location: site.location || '',
    services: (site.services || []).join(', '), email: site.email || '', phone: site.phone || '', profileImageUrl: site.profileImageUrl || ''
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
              <input type="hidden" name="subdomain" value={site.subdomain} />
              {step.name === 'profileImageUrl' ? (
                <div className="rounded-xl border border-border bg-muted/20 p-5"><ProfileImageUpload subdomain={site.subdomain} currentImageUrl={values.profileImageUrl} onUploaded={(url) => setValues((current) => ({ ...current, profileImageUrl: url }))} /></div>
              ) : step.name === 'identity' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label htmlFor="sitterName" className="mb-2 block text-sm font-medium">Your name</label><input autoFocus id="sitterName" name="sitterName" value={values.sitterName} onChange={(event) => setValues((current) => ({ ...current, sitterName: event.target.value }))} placeholder="Jamie" className="h-16 w-full rounded-xl border border-input bg-background px-5 text-lg shadow-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15" /></div>
                  <div><label htmlFor="businessName" className="mb-2 block text-sm font-medium">Business name <span className="font-normal text-muted-foreground">(optional)</span></label><input id="businessName" name="businessName" value={values.businessName} onChange={(event) => setValues((current) => ({ ...current, businessName: event.target.value }))} placeholder="Happy Tails Pet Care" className="h-16 w-full rounded-xl border border-input bg-background px-5 text-lg shadow-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15" /></div>
                </div>
              ) : (
                <input autoFocus id={step.name} name={step.name} type={'type' in step ? step.type : 'text'} required={step.required} value={values[step.name]} onChange={(event) => setValues((current) => ({ ...current, [step.name]: event.target.value }))} placeholder={step.placeholder} className="h-16 w-full rounded-xl border border-input bg-background px-5 text-lg shadow-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15" />
              )}
              {state.error && <p role="alert" className="mt-3 text-sm text-destructive">{state.error}</p>}
              <div className="mt-7 flex items-center gap-3">
                {stepIndex > 0 && <Button type="button" variant="ghost" size="lg" onClick={() => setStepIndex((current) => current - 1)}><ArrowLeft aria-hidden="true" />Back</Button>}
                <Button type="submit" size="lg" disabled={isSaving || (step.name === 'identity' && !values.sitterName.trim() && !values.businessName.trim())}>{isSaving ? <><Loader2 className="animate-spin" aria-hidden="true" />Saving…</> : stepIndex === onboardingSteps.length - 1 ? <>Finish my site <ArrowRight aria-hidden="true" /></> : <>Continue <ArrowRight aria-hidden="true" /></>}</Button>
              </div>
              <p className="mt-7 text-xs text-muted-foreground"><kbd className="mr-2 rounded border border-border bg-muted px-2 py-1 font-sans">Enter</kbd>Press Enter to continue</p>
            </form>
          </div>
        </main>
        <SitePreview site={site} values={values} />
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

function ProfileField({ label, name, defaultValue, placeholder, type = 'text', className }: { label: string; name: string; defaultValue: string; placeholder: string; type?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input id={name} name={name} type={type} defaultValue={name === 'phone' ? formatPhoneNumber(defaultValue) : defaultValue} placeholder={placeholder} onChange={name === 'phone' ? (event) => { event.currentTarget.value = formatPhoneNumber(event.currentTarget.value); } : undefined} inputMode={name === 'phone' ? 'tel' : undefined} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10" />
    </div>
  );
}

function ProfileEditor({ site }: { site: SiteProfile }) {
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
        <input type="hidden" name="subdomain" value={site.subdomain} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <SuggestionField label="Your name" name="sitterName" defaultValue={site.sitterName || ''} placeholder="Jamie" suggestions={profileSuggestions.sitterName} hint="The name pet owners will see first." />
          <SuggestionField label="Business name" name="businessName" defaultValue={site.businessName || ''} placeholder="Happy Tails Pet Care" suggestions={profileSuggestions.businessName} hint="Choose a suggestion or type your own." />
          <SuggestionField label="One-sentence introduction" name="tagline" defaultValue={site.tagline || ''} placeholder="Reliable care for pets nearby." suggestions={profileSuggestions.tagline} hint="Choose a starting point or write your own." />
          <ServiceAreaField defaultValue={site.location || ''} />
          <ServicesField defaultValue={site.services || []} />
          <ProfileField label="Phone" name="phone" type="tel" defaultValue={site.phone || ''} placeholder="(555) 123-4567" />
          <ProfileField label="Email" name="email" type="email" defaultValue={site.email || ''} placeholder="hello@example.com" />
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Profile photo</p>
            <ProfileImageUpload subdomain={site.subdomain} currentImageUrl={site.profileImageUrl} />
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
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-emerald-700 transition-colors group-hover:bg-accent dark:text-emerald-400"><PetIcon value={site.emoji} className="size-6" fallbackClassName="text-2xl" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" /><p className="truncate text-sm font-semibold">{site.businessName || site.sitterName || site.subdomain}</p></div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">{site.subdomain}.{rootDomain}<ExternalLink aria-hidden="true" className="size-3 opacity-0 transition-opacity group-hover:opacity-100" /></p>
          </div>
          <a
            href={`${protocol}://${site.subdomain}.${rootDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 rounded-xl focus:outline-none"
            aria-label={`Open ${site.businessName || site.sitterName || site.subdomain} site`}
          />
          <div className="relative z-10 flex shrink-0 items-center gap-1">
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
  pending: { title: 'Stripe is reviewing your details', detail: 'Nothing else is needed right now. We’ll check again whenever you open this dashboard.', button: '', icon: Clock3, tone: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950' },
  ready: { title: 'Ready to accept payments', detail: 'Stripe is connected. Pet owners can choose an amount on your public site, and you can also send payment requests from inquiries.', button: '', icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950' },
  reconnect_required: { title: 'Reconnect Stripe', detail: 'This payment account belongs to a different Stripe sandbox. Reconnect it to continue with the current Sitterfolio sandbox.', button: 'Reconnect Stripe', icon: CircleAlert, tone: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950' },
  unavailable: { title: 'Status could not be refreshed', detail: 'Your Stripe details are safe. Try refreshing this page in a moment.', button: '', icon: RotateCw, tone: 'text-muted-foreground bg-muted' },
} as const;

function StripeOnboardingButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending} aria-disabled={pending}>
    {pending ? <><Loader2 className="animate-spin" aria-hidden="true" />Opening Stripe…</> : label}
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
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${content.tone}`}><Icon className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" /></span>
      <div>
        <p className="font-medium">{business.businessName}</p>
        <p className="mt-0.5 text-sm font-medium">{isRefreshing ? 'Checking Stripe status…' : content.title}</p>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{content.detail}</p>
        <div aria-live="polite" className="mt-1 text-xs text-muted-foreground">
          {refreshState.error ? <span className="text-destructive">{refreshState.error}</span> : refreshState.refreshedAt ? 'Status refreshed just now.' : null}
        </div>
      </div>
    </div>
    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
      {content.button && <form action={startStripeOnboardingAction}><input type="hidden" name="businessId" value={business.businessId} /><StripeOnboardingButton label={content.button} /></form>}
      {canManage && <Button asChild size="sm" variant="outline"><a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">Manage in Stripe <ExternalLink aria-hidden="true" /></a></Button>}
      {canRefresh && <form action={refreshAction}><input type="hidden" name="businessId" value={business.businessId} /><Button type="submit" size="sm" variant="outline" disabled={isRefreshing}>{isRefreshing ? <><Loader2 className="animate-spin" aria-hidden="true" />Checking…</> : <><RotateCw aria-hidden="true" />Refresh status</>}</Button></form>}
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
          ? 'You’re back from Stripe, but a few details still need attention.'
          : null;

  return (
    <section className={`rounded-2xl border border-border bg-card ${isReady ? 'p-5 sm:p-6' : 'p-4 sm:p-5'}`}>
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

export function AdminDashboard({ sites, leads, revenue, paymentSetup, stripeReturn }: { sites: SiteProfile[]; leads: import('@/lib/profile-ownership').OwnedLead[]; revenue: { inquiries: number; qualified: number; paymentRequests: number; booked: number; successfulPayments: number; grossPaidCents: number; generatedRevenueCents: number; sources: { source: string; generatedRevenueCents: number }[]; sites: { subdomain: string; generatedRevenueCents: number }[] }; paymentSetup: PaymentSetup[]; stripeReturn?: string }) {
  const [state, action, isPending] = useActionState<DeleteState, FormData>(
    deleteSubdomainAction,
    {}
  );

  const onboardingSite = sites.find((site) => site.onboardingCompletedAt === null);
  if (onboardingSite) return <ProfileOnboarding site={onboardingSite} />;

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-12 px-5 pb-12 pt-8 lg:px-8 lg:pb-16 lg:pt-12">
      <DashboardHeader />
      <section className="space-y-4"><div><h2 className="text-xl font-semibold">Share your site</h2><p className="mt-1 text-sm text-muted-foreground">Preview each live site or copy its link to send to a pet owner.</p></div><SiteGrid sites={sites} action={action} isPending={isPending} /></section>
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-6 dark:bg-emerald-950/20"><p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Generated from your sites</p><p className="mt-2 text-4xl font-semibold tracking-tight">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(revenue.generatedRevenueCents / 100)}</p><p className="mt-2 text-sm text-muted-foreground">Net paid customer volume after refunds · {revenue.inquiries} inquiries · {revenue.paymentRequests} payment requests · {revenue.successfulPayments} successful payments</p><div className="mt-4 flex flex-wrap gap-2">{revenue.sites.map((item) => <span key={item.subdomain} className="rounded-full bg-background/80 px-3 py-1 text-xs">{item.subdomain}: {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(item.generatedRevenueCents/100)} generated</span>)}</div>{revenue.sources.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{revenue.sources.map((item) => <span key={item.source} className="rounded-full bg-background/80 px-3 py-1 text-xs">{item.source}: {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(item.generatedRevenueCents/100)}</span>)}</div>}</section>
      {paymentSetup.some((business) => business.status !== 'ready') && <StripeSetup businesses={paymentSetup} stripeReturn={stripeReturn} />}
      {sites[0] && <ProfileEditor site={sites[0]} />}
      <section className="space-y-4"><div><h2 className="text-xl font-semibold">Recent inquiries</h2><p className="mt-1 text-sm text-muted-foreground">Messages pet owners sent through your sites.</p></div><LeadInbox leads={leads} /></section>
      {paymentSetup.length > 0 && paymentSetup.every((business) => business.status === 'ready') && <StripeSetup businesses={paymentSetup} stripeReturn={stripeReturn} />}

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
