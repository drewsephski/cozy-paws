'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, LoaderCircle, RotateCcw, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoverImportCard, type RoverImportDraft } from '@/components/rover-import-card';
import type { ImportConfidence, ServiceFieldConfidence } from '@/lib/profile-import/types';
import type { ImportConfidence, RoverReviewEvidence, ServiceFieldConfidence } from '@/lib/profile-import/types';
import { createBrowserReviewStore, createReviewDraftPersistence, loadRestorableRoverReview, normalizeRestorableRoverReview, reviewKey, stripEphemeralRoverReviewEvidence, synchronizeRoverReviewServices, type StoredRoverReview } from './review-store';

type Site = { subdomain: string; sitterName?: string; businessName?: string; onboardingCompletedAt?: number | null };
type Review = StoredRoverReview & {
  expectedProfileRevision: number;
  current: Record<string, unknown>;
  confidence: Record<string, ImportConfidence>;
  serviceConfidence?: Record<string, ServiceFieldConfidence>;
  canonicalRoverUrl: string;
};
const PROFILE_FIELDS = [
  ['sitterName','Your name'], ['businessName','Business name'], ['tagline','Tagline'], ['location','Service area'], ['about','About']
] as const;
const CARE_FIELDS = [
  ['careRoutine','Care routine'], ['homeEnvironment','Home environment'], ['petPreferences','Pet preferences'],
  ['experienceSummary','Experience'], ['specialCareSummary','Special care']
] as const;

function statusText(value: string, current: string) {
  if (!value) return current ? `Not found on Rover. Your current value stays unchanged: ${current}` : 'Not found on Rover. Leave blank or add it now.';
  if (value === current) return 'Matches your current profile.';
  return current ? `Current value: ${current}` : 'New imported value.';
}

function confidenceLabel(confidence?: ImportConfidence) {
  return confidence === 'medium' ? <span className="ml-2 text-xs font-normal text-amber-700">Check this</span> : null;
}

export function RoverImportClient({ site }: { site: Site }) {
  const router = useRouter();
  const store = useMemo(() => createBrowserReviewStore(), []);
  const persistence = useMemo(() => createReviewDraftPersistence(store), [store]);
  const [source, setSource] = useState<RoverImportDraft | null>(null);
  const [status, setStatus] = useState<'ready'|'capture'|'captured'|'analysis'|'review'|'applying'|'success'|'error'>('ready');
  const [review, setReview] = useState<Review | null>(null);
  const [evidence, setEvidence] = useState<RoverReviewEvidence>({ profile: {}, services: {} });
  const [error, setError] = useState('');
  const prepareController = useRef<AbortController | null>(null);

  useEffect(() => { void (async () => {
    try { await store.sweep(); } catch { setError('This browser could not open the private review store. Allow site storage, then try again.'); setStatus('error'); return; }
    try {
      const draft = JSON.parse(localStorage.getItem('sitterfolio-draft') || '{}'); if (draft.roverImport) setSource(draft.roverImport);
      const lastKey = localStorage.getItem(`rover-profile-review:last:${site.subdomain}`);
      if (lastKey) {
        const restored = await loadRestorableRoverReview(store, lastKey, site.subdomain);
        if (restored.review) {
          setEvidence({ profile: {}, services: {} });
          setReview(restored.review as Review);
          setStatus('review');
        } else {
          localStorage.removeItem(`rover-profile-review:last:${site.subdomain}`);
          if (restored.discarded) { setError('The saved import review was invalid and was discarded safely. Start a fresh import.'); setStatus('error'); }
        }
      }
    } catch { setError('Your saved import review could not be restored. Start a fresh import.'); setStatus('error'); }
  })(); }, [site.subdomain, store]);

  useEffect(() => () => prepareController.current?.abort(), []);

  useEffect(() => {
    if (status !== 'review' || !review) return;
    const remaining = review.expiresAt - Date.now();
    const expire = () => {
      void persistence.remove(reviewKey(review.subdomain, review.attemptId)).finally(() => {
        localStorage.removeItem(`rover-profile-review:last:${site.subdomain}`);
        setReview(null);
        setError('This private review expired after 30 minutes. Start a fresh import.');
        setStatus('error');
      });
    };
    if (remaining <= 0) { expire(); return; }
    const timeout = window.setTimeout(expire, remaining);
    return () => window.clearTimeout(timeout);
  }, [persistence, review, site.subdomain, status]);

  function saveReview(next: Review) {
    const save = persistence.save(stripEphemeralRoverReviewEvidence(next));
    void save.catch(() => setError('Your latest review edits could not be saved in this browser. Keep this tab open and try again.'));
    return save;
  }

  async function clearSavedReview(current = review) {
    if (current) await persistence.remove(reviewKey(current.subdomain, current.attemptId));
    localStorage.removeItem(`rover-profile-review:last:${site.subdomain}`);
  }

  async function start(next = source) {
    if (!next) return;
    prepareController.current?.abort();
    try {
      await clearSavedReview();
    } catch {
      setError('The previous private review could not be removed. Allow site storage, then try again.');
      setStatus('error');
      return;
    }
    const controller = new AbortController();
    prepareController.current = controller;
    const attemptId = crypto.randomUUID();
    setError(''); setStatus('capture'); setReview(null); setEvidence({ profile: {}, services: {} });
    try {
      const response = await fetch('/api/profile-import/rover/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subdomain: site.subdomain, ...next, attemptId }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error((await response.json()).error?.message || 'Import could not start.');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) { const { done, value } = await reader.read(); buffer += decoder.decode(value || new Uint8Array(), { stream: !done }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) { if (!line) continue; const event = JSON.parse(line); if (event.type === 'progress') setStatus(event.stage === 'analysis_active' ? 'analysis' : event.stage === 'capture_complete' ? 'captured' : 'capture'); if (event.type === 'error') throw new Error(event.error.message); if (event.type === 'review_ready') {
          const draft = event.draft;
          const { evidence: nextEvidence, ...draftWithoutEvidence } = draft;
          const stored = { ...draftWithoutEvidence, reviewed: draft.reviewed } as Review;
          await saveReview(stored);
          setEvidence(nextEvidence ?? { profile: {}, services: {} });
          localStorage.setItem(`rover-profile-review:last:${site.subdomain}`, reviewKey(stored.subdomain, stored.attemptId)); setReview(stored); setStatus('review');
        } } if (done) break;
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Import failed.'); setStatus('error');
    } finally {
      if (prepareController.current === controller) prepareController.current = null;
    }
  }

  function commitReview(next: Review) {
    if (next.expiresAt <= Date.now()) {
      void persistence.remove(reviewKey(next.subdomain, next.attemptId));
      localStorage.removeItem(`rover-profile-review:last:${site.subdomain}`);
      setReview(null); setError('This private review expired after 30 minutes. Start a fresh import.'); setStatus('error');
      return;
    }
    setReview(next); void saveReview(next);
  }
  function update(name: string, value: string) { if (review) commitReview({ ...review, reviewed: { ...review.reviewed, [name]: value } }); }
  function updateServices(value: string) {
    if (!review) return;
    const services = value.split(',').map((name) => name.trim()).filter(Boolean).slice(0, 8);
    const synchronized = synchronizeRoverReviewServices(
      services,
      review.reviewed.serviceDetails as Record<string, Record<string, string>> | undefined,
      review.serviceConfidence
    );
    commitReview({
      ...review,
      reviewed: {
        ...review.reviewed,
        services,
        ...(synchronized.serviceDetails === undefined ? {} : { serviceDetails: synchronized.serviceDetails })
      },
      ...(synchronized.serviceConfidence === undefined ? {} : { serviceConfidence: synchronized.serviceConfidence })
    });
  }
  function updateServiceDetail(service: string, name: 'description'|'startingPrice'|'billingUnit', value: string) {
    if (!review || !Array.isArray(review.reviewed.services) || !review.reviewed.services.includes(service)) return;
    commitReview({ ...review, reviewed: { ...review.reviewed, serviceDetails: { ...(review.reviewed.serviceDetails as Record<string, unknown> || {}), [service]: { ...((review.reviewed.serviceDetails as Record<string, Record<string, string>> | undefined)?.[service] || {}), [name]: value } } } });
  }

  async function apply() {
    if (!review) return;
    const normalized = normalizeRestorableRoverReview(review, site.subdomain, reviewKey(review.subdomain, review.attemptId));
    if (!normalized) {
      try { await clearSavedReview(review); } catch { /* expiry sweep remains available */ }
      setReview(null); setError('This private review expired or became invalid. Start a fresh import.'); setStatus('error');
      return;
    }
    const validReview = normalized as Review;
    setStatus('applying'); setError('');
    try { const applyId = typeof validReview.applyId === 'string' ? validReview.applyId : crypto.randomUUID(); const nextReview = { ...validReview, applyId }; if (!validReview.applyId) { setReview(nextReview); await saveReview(nextReview); }
      const form = new FormData(); form.set('review', JSON.stringify({ subdomain: site.subdomain, applyId, expectedProfileRevision: validReview.expectedProfileRevision, reviewed: validReview.reviewed }));
      const response = await fetch('/api/profile-import/rover/apply', { method: 'POST', body: form }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || 'Import could not be applied.');
      await persistence.remove(reviewKey(validReview.subdomain, validReview.attemptId)); localStorage.removeItem(`rover-profile-review:last:${site.subdomain}`); setStatus('success'); localStorage.removeItem('sitterfolio-draft');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Import could not be applied.'); setStatus('review'); }
  }

  async function discard() {
    prepareController.current?.abort();
    try { await clearSavedReview(); } catch { /* expiry still removes the draft */ }
    router.push('/admin');
  }

  const previewValue = (name: string) => String(review?.reviewed[name] || review?.current[name] || '');
  const importedServices = (review?.reviewed.services as string[] | undefined) ?? [];
  const currentServices = (review?.current.services as string[] | undefined) ?? [];
  const previewServices = importedServices.length ? importedServices : currentServices;
  const previewServiceDetails = (importedServices.length ? review?.reviewed.serviceDetails : review?.current.serviceDetails) as Record<string, Record<string, string>> | undefined;
  const previewCare = [
    ['Care routine', 'careRoutine'], ['Home environment', 'homeEnvironment'], ['Pet preferences', 'petPreferences'],
    ['Experience', 'experienceSummary'], ['Special care', 'specialCareSummary']
  ] as const;
  const hasVisibleSource = Object.keys(evidence.profile).length > 0 || Object.values(evidence.services).some((service) => Object.keys(service).length > 0);

  function visibleSource(value?: string) {
    return value ? <p className="mt-1 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Visible source:</span> {value}</p> : null;
  }

  function renderTextFields(fields: typeof PROFILE_FIELDS | typeof CARE_FIELDS) {
    return fields.map(([name, label]) => {
      const value = String(review?.reviewed[name] || '');
      const current = String(review?.current[name] || '');
      const long = ['about','careRoutine','homeEnvironment','petPreferences','experienceSummary','specialCareSummary'].includes(name);
      return <div key={name} className={long ? 'sm:col-span-2' : ''}>
        <label htmlFor={name} className="text-sm font-medium">{label}{confidenceLabel(review?.confidence[name])}</label>
        {long
          ? <textarea id={name} rows={5} value={value} onChange={(event) => update(name, event.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm" />
          : <input id={name} value={value} onChange={(event) => update(name, event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />}
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{statusText(value, current)}</p>{visibleSource(evidence.profile[name])}
      </div>;
    });
  }

  return <main className="mx-auto w-full max-w-6xl px-5 py-10 lg:px-8">
    <div className="max-w-2xl"><p className="text-xs font-medium uppercase tracking-[.16em] text-emerald-700">Optional jump-start</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">Bring your Rover profile over.</h1><p className="mt-4 text-base leading-7 text-muted-foreground">We&apos;ll capture the visible profile, organize supported details, and let you edit everything before applying it. Profile photos are not imported, so your current image stays unchanged.</p></div>
    {status === 'ready' && <div className="mt-8 max-w-2xl"><RoverImportCard site={site.subdomain} initialValue={source ?? undefined} onChoose={(value) => { setSource(value); void start(value); }} /><Button variant="ghost" className="mt-3" onClick={() => router.push('/admin')}>Enter details myself</Button></div>}
    {(status === 'capture' || status === 'captured' || status === 'analysis' || status === 'applying') && <div role="status" className="mt-10 max-w-2xl rounded-2xl border border-border bg-card p-8"><LoaderCircle className="size-7 animate-spin text-emerald-700" /><h2 className="mt-5 text-xl font-semibold">{status === 'capture' ? 'Capturing your visible Rover profile…' : status === 'captured' ? 'Capture complete. Preparing analysis…' : status === 'analysis' ? 'Organizing your profile details…' : 'Applying your reviewed profile…'}</h2><p className="mt-2 text-sm text-muted-foreground">Your live profile has not changed yet.</p></div>}
    {status === 'review' && review && <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <section className="space-y-5">
        <div><h2 className="text-2xl font-semibold">Review what we found</h2><p className="mt-2 text-sm text-muted-foreground">Open each section when you&apos;re ready. Not-found fields are called out explicitly and leave your current content unchanged.</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{hasVisibleSource ? 'Visible source snippets are shown only during this active import session and are not retained with the draft.' : 'Visible source snippets are available only during the active import session; this restored review does not retain them.'}</p></div>
        {error && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Needs attention.</strong> {error}</div>}

        <details open className="group rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer list-none font-semibold marker:hidden">Profile essentials <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">Show fields</span></summary>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">{renderTextFields(PROFILE_FIELDS)}</div>
        </details>

        <details className="group rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer list-none font-semibold marker:hidden">Services and prices <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">Show fields</span></summary>
          <div className="mt-5">
            <label htmlFor="review-services" className="text-sm font-medium">Services{confidenceLabel(review.confidence.services)}</label>
            <input id="review-services" value={importedServices.join(', ')} onChange={(event) => updateServices(event.target.value)} placeholder="Dog walking, Drop-in visits" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{importedServices.length ? 'These services replace your current service list. Separate up to eight with commas.' : currentServices.length ? `No services found on Rover. Your current services stay unchanged: ${currentServices.join(', ')}` : 'No services found on Rover. Add them here or leave this unchanged.'}</p>
            <div className="mt-5 space-y-4">{importedServices.map((service) => {
              const details = (review.reviewed.serviceDetails as Record<string, Record<string, string>> | undefined)?.[service] || {};
              const currentDetails = (review.current.serviceDetails as Record<string, Record<string, string>> | undefined)?.[service] || {};
              const confidence = review.serviceConfidence?.[service];
              return <fieldset key={service} className="rounded-xl border border-border p-4">
                <legend className="px-1 text-sm font-semibold">{service}{confidenceLabel(confidence?.name)}</legend>{visibleSource(evidence.services[service]?.name)}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><label className="text-xs font-medium" htmlFor={`service-${service}-description`}>Description{confidenceLabel(confidence?.description)}</label><textarea id={`service-${service}-description`} value={details.description || ''} onChange={(event) => updateServiceDetail(service,'description',event.target.value)} placeholder="Service description" rows={3} className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm" /><p className="mt-1 text-xs text-muted-foreground">{statusText(details.description || '', currentDetails.description || '')}</p>{visibleSource(evidence.services[service]?.description)}</div>
                  <div><label className="text-xs font-medium" htmlFor={`service-${service}-price`}>Starting price{confidenceLabel(confidence?.startingPrice)}</label><input id={`service-${service}-price`} value={details.startingPrice || ''} onChange={(event) => updateServiceDetail(service,'startingPrice',event.target.value)} placeholder="$45" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /><p className="mt-1 text-xs text-muted-foreground">{statusText(details.startingPrice || '', currentDetails.startingPrice || '')}</p>{visibleSource(evidence.services[service]?.startingPrice)}</div>
                  <div><label className="text-xs font-medium" htmlFor={`service-${service}-unit`}>Billing unit{confidenceLabel(confidence?.billingUnit)}</label><input id={`service-${service}-unit`} value={details.billingUnit || ''} onChange={(event) => updateServiceDetail(service,'billingUnit',event.target.value)} placeholder="per night" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /><p className="mt-1 text-xs text-muted-foreground">{statusText(details.billingUnit || '', currentDetails.billingUnit || '')}</p>{visibleSource(evidence.services[service]?.billingUnit)}</div>
                </div>
              </fieldset>;
            })}</div>
          </div>
        </details>

        <details className="group rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer list-none font-semibold marker:hidden">Care, home, and experience <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">Show fields</span></summary>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">{renderTextFields(CARE_FIELDS)}</div>
        </details>

        <div className="flex flex-wrap gap-3"><Button onClick={() => void apply()}>Apply to my Sitterfolio</Button><Button variant="outline" onClick={() => void start()}><RotateCcw className="size-4" />Start over</Button><Button variant="ghost" onClick={() => void discard()}>Discard</Button></div>
      </section>

      <aside className="self-start rounded-2xl border border-border bg-muted/25 p-5 lg:sticky lg:top-24">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Public preview</p>
        <WandSparkles className="mt-8 size-8 text-emerald-700" />
        <h3 className="mt-4 text-2xl font-semibold">{previewValue('businessName') || previewValue('sitterName') || site.businessName || site.sitterName || 'Your profile'}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{previewValue('location') || 'Your service area'}</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{previewValue('tagline') || 'Your introduction will appear here.'}</p>
        {previewValue('about') && <p className="mt-5 border-t border-border pt-4 text-sm leading-6">{previewValue('about')}</p>}
        <div className="mt-5 space-y-3">{previewServices.map((service) => { const detail = previewServiceDetails?.[service]; return <div key={service} className="rounded-xl border border-border bg-background/70 p-3"><p className="text-sm font-semibold">{service}</p>{detail?.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail.description}</p>}{(detail?.startingPrice || detail?.billingUnit) && <p className="mt-2 text-xs font-medium text-emerald-800">{[detail.startingPrice, detail.billingUnit].filter(Boolean).join(' ')}</p>}</div>; })}</div>
        {previewServices.some((service) => Boolean(previewServiceDetails?.[service]?.startingPrice)) && <p className="mt-3 text-[11px] leading-4 text-muted-foreground">Starting prices are self-reported; confirm directly.</p>}
        <div className="mt-5 space-y-4">{previewCare.flatMap(([label, name]) => { const value = previewValue(name); return value ? [<div key={name}><p className="text-xs font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{value}</p></div>] : []; })}</div>
      </aside>
    </div>}
    {status === 'error' && <div role="alert" className="mt-10 max-w-2xl rounded-2xl border border-red-300 bg-red-50 p-6 text-red-900"><AlertCircle className="size-6" /><h2 className="mt-3 font-semibold">Import stopped safely</h2><p className="mt-2 text-sm">{error} Your current Sitterfolio was not changed.</p><div className="mt-5 flex gap-3"><Button onClick={() => void start()}>Try again</Button><Button variant="ghost" onClick={() => router.push('/admin')}>Enter details myself</Button></div></div>}
    {status === 'success' && <div role="status" className="mt-10 max-w-2xl rounded-2xl border border-emerald-300 bg-emerald-50 p-8"><CheckCircle2 className="size-8 text-emerald-700" /><h2 className="mt-4 text-2xl font-semibold text-emerald-950">Your imported details are saved.</h2><Button className="mt-6" onClick={() => router.push('/admin')}>Continue setup</Button></div>}
  </main>;
}
