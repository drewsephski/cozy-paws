export type PublicTestimonial = { id: string; text: string; source: string };

export function TestimonialList({ testimonials }: { testimonials: PublicTestimonial[] }) {
  if (!testimonials.length) return null;
  return (
    <section className="mt-9 border-t border-border pt-9" aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="text-lg font-semibold">Self-published testimonials</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Sitterfolio did not verify the care, client, transaction, or claims in these testimonials.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {testimonials.map((testimonial) => (
          <figure key={testimonial.id} className="rounded-xl border border-border bg-card p-5">
            <blockquote className="text-sm leading-6 text-foreground/90">“{testimonial.text}”</blockquote>
            <figcaption className="mt-4 text-xs font-medium text-muted-foreground">— {testimonial.source}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
