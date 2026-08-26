import { getSession } from '@/lib/session';
import { trustReferralEligibility } from '@/lib/trust-referral-eligibility';

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const exported = await trustReferralEligibility.exportOwnedBusinessTestimonials(session.user.id);
  return Response.json(exported, {
    headers: { 'Content-Disposition': 'attachment; filename="sitterfolio-testimonials.json"' }
  });
}
