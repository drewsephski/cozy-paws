import Image from 'next/image';

export function LandingProductBento() {
  return (
    <div className="landing-bento-grid">
      <article className="landing-bento-card landing-bento-card--site">
        <div className="landing-bento-copy">
          <p className="text-sm font-medium landing-accent">Your public site</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-.03em]">A polished page that feels like your business.</h3>
          <p className="mt-3 max-w-md leading-7 landing-muted">Put your photo, services, service area, and care details in one place that is easy to share.</p>
        </div>
        <div className="landing-bento-art landing-bento-art--site" aria-hidden="true">
          <Image src="/landing/bento-public-site.webp" alt="" width={720} height={1080} sizes="(min-width: 896px) 48vw, 90vw" />
        </div>
      </article>

      <article className="landing-bento-card landing-bento-card--request">
        <div className="landing-bento-copy">
          <p className="text-sm font-medium landing-accent">Availability requests</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Start with the useful details.</h3>
          <p className="mt-3 leading-7 landing-muted">Dates, service, pets, ZIP code, and care notes arrive with the first request.</p>
        </div>
        <div className="landing-bento-art landing-bento-art--request" aria-hidden="true">
          <Image src="/landing/bento-availability-request.webp" alt="" width={800} height={533} sizes="(min-width: 896px) 34vw, 90vw" />
        </div>
      </article>

      <article className="landing-bento-card landing-bento-card--inbox">
        <div className="landing-bento-copy">
          <p className="text-sm font-medium landing-accent">Your private inbox</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Know what needs a reply.</h3>
          <p className="mt-3 leading-7 landing-muted">Keep the original request and the conversation together instead of chasing an old message thread.</p>
        </div>
        <div className="landing-bento-art landing-bento-art--inbox" aria-hidden="true">
          <Image src="/landing/bento-private-inbox.webp" alt="" width={800} height={533} sizes="(min-width: 896px) 34vw, 90vw" />
        </div>
      </article>

      <article className="landing-bento-card landing-bento-card--clients">
        <div className="landing-bento-copy">
          <p className="text-sm font-medium">Saved clients and pets</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Remember the household, not the thread.</h3>
          <p className="mt-3 leading-7 landing-muted">Save reusable contact and pet-care details after an inquiry becomes a real client relationship.</p>
        </div>
        <div className="landing-bento-art landing-bento-art--clients" aria-hidden="true">
          <Image src="/landing/bento-client-pets.webp" alt="" width={680} height={746} sizes="(min-width: 896px) 26vw, 90vw" />
        </div>
      </article>

      <article className="landing-bento-card landing-bento-card--booking">
        <div className="landing-bento-copy">
          <p className="text-sm font-medium landing-accent">Dated bookings</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Plan care after the request is a fit.</h3>
          <p className="mt-3 max-w-lg leading-7 landing-muted">Create one dated booking for a saved household, choose the pets, agree on the amount, and move it forward when you are ready.</p>
        </div>
        <div className="landing-bento-art landing-bento-art--booking" aria-hidden="true">
          <Image src="/landing/bento-booking.webp" alt="" width={900} height={600} sizes="(min-width: 896px) 52vw, 90vw" />
        </div>
      </article>

      <article className="landing-bento-card landing-bento-card--payment">
        <div className="landing-bento-copy">
          <p className="text-sm font-medium landing-accent">Payment requests</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Send a secure checkout link when you are ready.</h3>
          <p className="mt-3 max-w-xl leading-7 landing-muted">Create a fixed payment request for qualified care, then share one link with the pet owner. You decide when it goes out.</p>
        </div>
        <div className="landing-bento-art landing-bento-art--payment" aria-hidden="true">
          <Image src="/landing/bento-payment-link.webp" alt="" width={900} height={600} sizes="(min-width: 896px) 48vw, 90vw" />
        </div>
      </article>
    </div>
  );
}
