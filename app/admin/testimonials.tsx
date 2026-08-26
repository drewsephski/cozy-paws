'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { createTestimonialAction, removeTestimonialAction, setTestimonialPublishedAction, updateTestimonialAction, type TestimonialActionState } from '@/app/actions';
import type { Testimonial } from '@/lib/trust-referral-eligibility';

type ManagedTestimonial = Pick<Testimonial, 'id' | 'siteSubdomain' | 'type' | 'text' | 'source' | 'permissionAttestedAt' | 'publishedAt' | 'hiddenAt' | 'createdAt' | 'updatedAt'>;

function ActionFeedback({ state }: { state: TestimonialActionState }) {
  if (state.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state.success) return <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{state.success}</p>;
  return null;
}

function ManagedTestimonialCard({ testimonial }: { testimonial: ManagedTestimonial }) {
  const [updateState, updateAction, updating] = useActionState<TestimonialActionState, FormData>(updateTestimonialAction, {});
  const [publicationState, publicationAction, changingPublication] = useActionState<TestimonialActionState, FormData>(setTestimonialPublishedAction, {});
  const [removeState, removeAction, removing] = useActionState<TestimonialActionState, FormData>(removeTestimonialAction, {});
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{testimonial.siteSubdomain} · {testimonial.publishedAt ? 'Published' : 'Hidden'}</p><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Self-published testimonial</span></div>
      <form action={updateAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_15rem]">
        <input type="hidden" name="testimonialId" value={testimonial.id} />
        <textarea aria-label={`Testimonial for ${testimonial.source}`} name="text" required maxLength={1000} defaultValue={testimonial.text} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input aria-label={`Displayed source for ${testimonial.source}`} name="source" required maxLength={120} defaultValue={testimonial.source} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" />
        <label className="flex items-start gap-2 text-sm leading-6 sm:col-span-2"><input type="checkbox" name="permissionAttested" value="true" required defaultChecked className="mt-1" /><span>I confirm I still have permission to publish this testimonial.</span></label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Button type="submit" size="sm" disabled={updating}>{updating ? 'Saving…' : 'Save changes'}</Button><ActionFeedback state={updateState} /></div>
      </form>
      <div className="mt-3 grid gap-2">
        <div className="flex flex-wrap items-center gap-3"><form action={publicationAction}><input type="hidden" name="testimonialId" value={testimonial.id} /><input type="hidden" name="published" value={testimonial.publishedAt ? 'false' : 'true'} /><Button type="submit" size="sm" variant="outline" disabled={changingPublication}>{changingPublication ? (testimonial.publishedAt ? 'Hiding…' : 'Publishing…') : testimonial.publishedAt ? 'Hide' : 'Publish'}</Button></form><ActionFeedback state={publicationState} /></div>
        <div className="flex flex-wrap items-center gap-3"><form action={removeAction}><input type="hidden" name="testimonialId" value={testimonial.id} /><Button type="submit" size="sm" variant="destructive" disabled={removing}>{removing ? 'Removing…' : 'Remove'}</Button></form><ActionFeedback state={removeState} /></div>
      </div>
    </article>
  );
}

export function Testimonials({ sites, testimonials }: { sites: Array<{ subdomain: string; name: string }>; testimonials: ManagedTestimonial[] }) {
  const [state, createAction, pending] = useActionState<TestimonialActionState, FormData>(createTestimonialAction, {});
  if (!sites.length) return null;
  return (
    <section id="testimonials" className="scroll-mt-24 space-y-5" aria-labelledby="manage-testimonials-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
        <h2 id="manage-testimonials-heading" className="text-xl font-semibold">Self-published testimonials</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Share praise you have permission to use. Sitterfolio does not verify the care or claims.</p>
          </div>
          <Button asChild size="sm" variant="outline"><a href="/api/export/testimonials">Download testimonial export</a></Button>
        </div>

      <form action={createAction} className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="testimonial-text" className="mb-1.5 block text-sm font-medium">Testimonial</label><textarea id="testimonial-text" name="text" required maxLength={1000} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        <div><label htmlFor="testimonial-source" className="mb-1.5 block text-sm font-medium">Displayed source</label><input id="testimonial-source" name="source" required maxLength={120} placeholder="Morgan, dog-walking client" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
        <div><label htmlFor="testimonial-site" className="mb-1.5 block text-sm font-medium">Site</label><select id="testimonial-site" name="subdomain" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">{sites.map((site) => <option key={site.subdomain} value={site.subdomain}>{site.name}</option>)}</select></div>
        <label className="flex items-start gap-2 text-sm leading-6 sm:col-span-2"><input type="checkbox" name="permissionAttested" value="true" required className="mt-1" /><span>I confirm I have permission to publish this testimonial.</span></label>
        <input type="hidden" name="published" value="true" />
        <div className="flex items-center gap-3 sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? 'Publishing…' : 'Publish testimonial'}</Button><ActionFeedback state={state} /></div>
      </form>

      {testimonials.length > 0 && <div className="grid gap-4">
        {testimonials.map((testimonial) => <ManagedTestimonialCard key={testimonial.id} testimonial={testimonial} />)}
      </div>}
    </section>
  );
}
