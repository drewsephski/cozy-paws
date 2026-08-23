'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PetIcon } from '@/components/pet-icon';
import { rootDomain } from '@/lib/utils';

type Draft = {
  subdomain: string;
  icon: string;
  sitterName: string;
  businessName: string;
  tagline: string;
  location: string;
  services: string;
  email: string;
  phone: string;
};

const emptyDraft: Draft = { subdomain: '', icon: '', sitterName: '', businessName: '', tagline: '', location: '', services: '', email: '', phone: '' };
const steps = [
  { name: 'identity', title: 'Who will pet owners be contacting?', helper: 'Add your name, a business name, or both. At least one is required.', placeholder: '', required: true },
  { name: 'tagline', title: 'How would you describe your care?', helper: 'Write one sentence about the care clients can expect from you.', placeholder: 'Reliable visits for dogs and cats in Oak Park.', required: true },
  { name: 'location', title: 'Where do you care for pets?', helper: 'Name the neighborhood, city, or area you serve.', placeholder: 'Oak Park and nearby neighborhoods', required: true },
  { name: 'services', title: 'Which services do you offer?', helper: 'Separate each service with a comma. You can add up to eight.', placeholder: 'Dog walking, Drop-in visits, Overnight stays', required: true },
  { name: 'email', title: 'Where should pet owners email you?', helper: 'Clients will use this address to reply to you.', placeholder: 'hello@example.com', type: 'email', required: true },
  { name: 'phone', title: 'Do you want to share a phone number?', helper: 'Optional. Leave this blank if you prefer email.', placeholder: '(555) 123-4567', type: 'tel', required: false }
] as const;

export function DraftBuilder({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem('sitterfolio-draft') || '{}') as Partial<Draft>;
      if (!stored.subdomain || !stored.icon) {
        router.replace('/');
        return;
      }
      setDraft({ ...emptyDraft, ...stored });
      setReady(true);
    } catch {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (ready) window.localStorage.setItem('sitterfolio-draft', JSON.stringify(draft));
  }, [draft, ready]);

  if (!ready) return <main className="mx-auto max-w-6xl px-5 py-16 text-sm text-muted-foreground">Loading your draft...</main>;

  const step = steps[stepIndex];
  const services = draft.services.split(',').map((service) => service.trim()).filter(Boolean);

  function continueDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }
    router.push(signedIn ? '/launch' : '/auth?callbackURL=%2Flaunch');
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="mb-8 lg:max-w-[calc(100%-28rem)]">
        <div className="flex items-end justify-between gap-4"><h1 className="text-lg font-semibold">Build your Sitterfolio</h1><span className="text-sm text-muted-foreground">{stepIndex + 1} of {steps.length}</span></div>
        <div className="mt-4 grid grid-cols-6 gap-2">{steps.map((item, index) => <span key={item.name} className={`h-1.5 rounded-full ${index <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />)}</div>
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600" />Your draft stays in this browser until you launch.</p>
      </div>
      <div className="grid items-start gap-10 border-t border-border pt-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
        <main className="flex min-h-[470px] flex-col justify-center py-4">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold tracking-[-.045em] sm:text-5xl lg:text-6xl">{step.title}</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">{step.helper}</p>
            <form onSubmit={continueDraft} className="mt-9">
              {step.name === 'identity' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label htmlFor="sitterName" className="mb-2 block text-sm font-medium">Your name</label><input autoFocus id="sitterName" value={draft.sitterName} onChange={(event) => setDraft((current) => ({ ...current, sitterName: event.target.value }))} placeholder="Jamie" className="h-16 w-full rounded-xl border border-input bg-background px-5 text-lg shadow-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15" /></div>
                  <div><label htmlFor="businessName" className="mb-2 block text-sm font-medium">Business name <span className="font-normal text-muted-foreground">(optional)</span></label><input id="businessName" value={draft.businessName} onChange={(event) => setDraft((current) => ({ ...current, businessName: event.target.value }))} placeholder="Happy Tails Pet Care" className="h-16 w-full rounded-xl border border-input bg-background px-5 text-lg shadow-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15" /></div>
                </div>
              ) : <input autoFocus key={step.name} id={step.name} type={'type' in step ? step.type : 'text'} required={step.required} value={draft[step.name]} onChange={(event) => setDraft((current) => ({ ...current, [step.name]: event.target.value }))} placeholder={step.placeholder} className="h-16 w-full rounded-xl border border-input bg-background px-5 text-lg shadow-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15" />}
              <div className="mt-7 flex items-center gap-3">
                {stepIndex > 0 && <Button type="button" variant="ghost" size="lg" onClick={() => setStepIndex((current) => current - 1)}><ArrowLeft />Back</Button>}
                <Button type="submit" size="lg" disabled={step.name === 'identity' && !draft.sitterName.trim() && !draft.businessName.trim()}>{stepIndex === steps.length - 1 ? <>Preview and launch <ArrowRight /></> : <>Continue <ArrowRight /></>}</Button>
              </div>
            </form>
            {!signedIn && <Button type="button" variant="link" className="mt-4 px-0" onClick={() => router.push('/auth?mode=sign-up&callbackURL=%2Flaunch')}>Skip to sign up</Button>}
          </div>
        </main>
        <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,.3)] lg:sticky lg:top-24">
          <div className="border-b border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">{draft.subdomain}.{rootDomain}</div>
          <div className="min-h-[440px] p-7 text-center sm:p-9">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-800"><PetIcon value={draft.icon} className="size-10" /></div>
            <h2 className="mt-5 text-2xl font-semibold text-emerald-800">{draft.sitterName || draft.businessName || 'Your name'}</h2>
            {draft.sitterName && draft.businessName && <p className="mt-1 text-sm font-medium text-emerald-700">{draft.businessName}</p>}
            <p className="mt-2 text-sm text-muted-foreground">{draft.location || `${draft.subdomain}.${rootDomain}`}</p>
            <p className="mx-auto mt-8 max-w-sm text-sm leading-6 text-muted-foreground">{draft.tagline || 'Your introduction will appear here.'}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">{(services.length ? services : ['Your services']).slice(0, 3).map((service) => <span key={service} className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">{service}</span>)}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
