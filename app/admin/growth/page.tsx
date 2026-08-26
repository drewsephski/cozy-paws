import { notFound, redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { growthEvidence } from '@/lib/growth-evidence';
import { isGrowthOperator } from '@/lib/growth-operator';
import { getSession } from '@/lib/session';
import type { OperationalGrowthReport } from '@/lib/growth-evidence';

export const metadata = { title: 'Growth evidence | Sitterfolio', robots: { index: false, follow: false } };

type ReportMetric = { label: string; value: number | null };

function Metric({ label, value }: ReportMetric) {
  return <div className="rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-3xl font-semibold">{value ?? 'Unavailable'}</dd></div>;
}

function ReportSection({ id, title, metrics, first = false }: { id: string; title: string; metrics: ReportMetric[]; first?: boolean }) {
  return <section className={first ? 'mt-8' : 'mt-10'} aria-labelledby={id}><h2 id={id} className="text-xl font-semibold">{title}</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{metrics.map((metric) => <Metric key={metric.label} {...metric} />)}</dl></section>;
}

export function GrowthReportView({ report }: { report: OperationalGrowthReport }) {
  const acquisition: ReportMetric[] = [
    { label: 'Selected contacts', value: report.acquisition.selectedContacts },
    { label: 'Substantive conversations', value: report.acquisition.substantiveConversations },
    { label: 'Trials', value: report.acquisition.trials },
    { label: 'Published Sites', value: report.acquisition.publishedSites },
    { label: 'Shared Businesses', value: report.acquisition.sharedBusinesses },
    { label: 'Qualified Businesses', value: report.acquisition.qualifiedBusinesses },
    { label: 'Paying Businesses', value: report.acquisition.payingBusinesses },
    { label: 'Referrals', value: report.acquisition.referrals },
    { label: 'Active Businesses, 30 days', value: report.acquisition.activeBusinesses30d }
  ];
  const ownerJourney: ReportMetric[] = [
    { label: 'Inquiries', value: report.ownerJourney.inquiries },
    { label: 'Businesses with sitter replies', value: report.ownerJourney.sitterReplies },
    { label: 'Qualified Leads', value: report.ownerJourney.qualifiedLeads },
    { label: 'Settled Lead payments', value: report.ownerJourney.settledLeadPayments },
    { label: 'Completed Bookings', value: report.ownerJourney.completedBookings },
    { label: 'Reviews', value: report.ownerJourney.reviews }
  ];
  return <div className="min-h-screen bg-background"><SiteHeader dashboard signedIn /><main className="mx-auto w-full max-w-6xl px-5 py-10 lg:px-8"><p className="text-sm font-medium text-emerald-700">Operator evidence</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Founding growth report</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Durable product evidence only. Unavailable stages are not inferred from page views or unrelated records.</p><ReportSection id="acquisition-title" title="Sitter acquisition" metrics={acquisition} first /><ReportSection id="owner-title" title="Owner journey" metrics={ownerJourney} /></main></div>;
}

export default async function GrowthEvidencePage() {
  const session = await getSession();
  if (!session) redirect('/auth?callbackURL=%2Fadmin%2Fgrowth');
  if (!isGrowthOperator(session.user.id)) notFound();
  return <GrowthReportView report={await growthEvidence.getOperationalReport()} />;
}
