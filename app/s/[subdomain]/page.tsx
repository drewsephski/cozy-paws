import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSubdomainData } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';
import { createLeadAction } from '@/app/actions';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      title: rootDomain
    };
  }

  return {
    title: `${subdomain}.${rootDomain}`,
    description: `Subdomain page for ${subdomain}.${rootDomain}`
  };
}

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#27332c]">
      <div className="absolute top-4 right-4">
        <Link
          href={`${protocol}://${rootDomain}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {rootDomain}
        </Link>
      </div>

      <main className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-28 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          {subdomainData.profileImageUrl ? <img src={subdomainData.profileImageUrl} alt={subdomainData.businessName || 'Profile'} className="mb-8 h-28 w-28 rounded-3xl object-cover shadow-lg" /> : <div className="mb-8 text-7xl">{subdomainData.emoji}</div>}
          <p className="mb-4 text-sm font-semibold uppercase tracking-[.2em] text-[#789178]">{subdomainData.location || 'Local, loving care'}</p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight sm:text-7xl">{subdomainData.businessName || `${subdomain}'s care`}</h1>
          <p className="mt-6 max-w-xl text-xl leading-8 text-[#617066]">{subdomainData.tagline || 'Thoughtful care for the pets you love.'}</p>
          <div className="mt-10 flex flex-wrap gap-3">{(subdomainData.services || []).map((service) => <span key={service} className="rounded-full bg-[#e7efe5] px-4 py-2 text-sm text-[#48604b]">{service}</span>)}</div>
        </section>
        <section className="rounded-3xl bg-[#27332c] p-7 text-white shadow-2xl shadow-[#27332c]/20">
          <h2 className="text-2xl font-semibold">Let’s make a plan</h2>
          <p className="mt-2 text-sm leading-6 text-[#c7d3c9]">Tell us a little about your pup and we’ll get back to you soon.</p>
          <form action={createLeadAction} className="mt-7 space-y-4">
            <input type="hidden" name="subdomain" value={subdomain} />
            <input name="name" required placeholder="Your name" className="w-full rounded-xl border-0 bg-white/10 px-4 py-3 text-white placeholder:text-[#aebcaf] outline-none ring-1 ring-white/15 focus:ring-[#b5d49f]" />
            <input name="email" type="email" required placeholder="Email address" className="w-full rounded-xl border-0 bg-white/10 px-4 py-3 text-white placeholder:text-[#aebcaf] outline-none ring-1 ring-white/15 focus:ring-[#b5d49f]" />
            <input name="dates" placeholder="When do you need care?" className="w-full rounded-xl border-0 bg-white/10 px-4 py-3 text-white placeholder:text-[#aebcaf] outline-none ring-1 ring-white/15 focus:ring-[#b5d49f]" />
            <textarea name="message" placeholder="Tell us about your dog" rows={4} className="w-full resize-none rounded-xl border-0 bg-white/10 px-4 py-3 text-white placeholder:text-[#aebcaf] outline-none ring-1 ring-white/15 focus:ring-[#b5d49f]" />
            <button className="w-full rounded-xl bg-[#b5d49f] px-4 py-3 font-semibold text-[#27332c] transition hover:bg-[#c7e0b5]">Request availability</button>
          </form>
        </section>
      </main>
    </div>
  );
}
