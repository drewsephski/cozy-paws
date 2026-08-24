import { ArrowRight, BadgeCheck, CircleDollarSign, Mail, PawPrint } from '@/components/ui/animated-icons';
import { Stat, StatDescription, StatIndicator, StatLabel, StatSeparator, StatTrend, StatValue } from '@/components/ui/stat';

export type RevenueSnapshot = {
  inquiries: number;
  qualified: number;
  paymentRequests: number;
  booked: number;
  successfulPayments: number;
  grossPaidCents: number;
  generatedRevenueCents: number;
  sources: { source: string; generatedRevenueCents: number }[];
  sites: { subdomain: string; generatedRevenueCents: number }[];
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });

function rate(part: number, whole: number) {
  return whole > 0 ? part / whole : 0;
}

export function BusinessPulse({ revenue }: { revenue: RevenueSnapshot }) {
  const inquiryToCustomer = rate(revenue.booked, revenue.inquiries);
  const maxSiteRevenue = Math.max(...revenue.sites.map((site) => site.generatedRevenueCents), 1);
  const journey = [
    { label: 'Inquiries', value: revenue.inquiries },
    { label: 'Qualified', value: revenue.qualified },
    { label: 'Requests', value: revenue.paymentRequests },
    { label: 'Customers', value: revenue.booked },
  ];

  return (
    <section aria-labelledby="business-pulse-title" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="business-pulse-title" className="text-xl font-semibold">From first hello to paid care</h2>
          <p className="mt-1 text-sm text-muted-foreground">See how pet owners move from inquiry to completed care.</p>
        </div>
        <p className="text-sm text-muted-foreground">All-time activity across your live sites</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <Stat className="overflow-hidden border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,.12),transparent_58%)] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <StatLabel>Generated revenue</StatLabel>
              <StatValue className="mt-3 break-words text-[clamp(2.5rem,9vw,3.75rem)] leading-none">{currency.format(revenue.generatedRevenueCents / 100)}</StatValue>
            </div>
            <StatIndicator variant="icon" color="success" className="size-11"><CircleDollarSign className="size-5" aria-hidden="true" /></StatIndicator>
          </div>
          <StatTrend trend={revenue.successfulPayments > 0 ? 'up' : 'neutral'}>
            <BadgeCheck className="size-4" aria-hidden="true" />
            {revenue.successfulPayments} successful {revenue.successfulPayments === 1 ? 'payment' : 'payments'}
          </StatTrend>
          <StatSeparator />
          <StatDescription>Net customer payments after refunds. This is pet-care revenue, not Sitterfolio fees.</StatDescription>
        </Stat>

        <Stat className="bg-foreground text-background shadow-[0_24px_70px_-42px_rgba(0,0,0,.65)] dark:bg-card dark:text-card-foreground">
          <div className="flex items-start justify-between gap-4">
            <div><StatLabel className="text-background/60 dark:text-muted-foreground">Inquiry conversion</StatLabel><StatValue className="mt-3 text-4xl">{percent.format(inquiryToCustomer)}</StatValue></div>
            <StatIndicator variant="icon" className="bg-background/10 text-background dark:bg-muted dark:text-foreground"><PawPrint className="size-5" aria-hidden="true" /></StatIndicator>
          </div>
          <StatSeparator className="bg-background/15 dark:bg-border" />
          <StatDescription className="text-background/65 dark:text-muted-foreground">{revenue.booked} of {revenue.inquiries} inquiries became customers.</StatDescription>
        </Stat>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat><div className="flex items-center justify-between"><StatLabel>New inquiries</StatLabel><StatIndicator variant="icon" color="info"><Mail className="size-4" aria-hidden="true" /></StatIndicator></div><StatValue>{revenue.inquiries}</StatValue><StatDescription>Pet owners who reached out through your sites.</StatDescription></Stat>
        <Stat><div className="flex items-center justify-between"><StatLabel>Payment requests</StatLabel><StatIndicator variant="icon" color="warning"><ArrowRight className="size-4" aria-hidden="true" /></StatIndicator></div><StatValue>{revenue.paymentRequests}</StatValue><StatDescription>Personal payment links created from inquiries.</StatDescription></Stat>
        <Stat><div className="flex items-center justify-between"><StatLabel>Customers booked</StatLabel><StatIndicator variant="icon" color="success"><BadgeCheck className="size-4" aria-hidden="true" /></StatIndicator></div><StatValue>{revenue.booked}</StatValue><StatDescription>Inquiries completed through an attributed payment.</StatDescription></Stat>
      </div>

      <div className="grid gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-24px_rgba(0,0,0,.35)] lg:grid-cols-[1.25fr_.75fr] lg:p-6">
        <div>
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Care journey</h3><span className="text-xs text-muted-foreground">All time</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2" aria-label="Inquiry funnel">
            {journey.map((step, index) => {
              const width = revenue.inquiries > 0 ? Math.max(18, rate(step.value, revenue.inquiries) * 100) : 18;
              return <div key={step.label} className="min-w-0"><div className="flex h-20 items-end overflow-hidden rounded-xl bg-muted/70"><div className="w-full rounded-xl bg-emerald-600/80 transition-[height] duration-700 motion-reduce:transition-none" style={{ height: `${width}%` }} /></div><p className="mt-2 text-xs leading-4 text-muted-foreground">{step.label}</p><p className="text-lg font-semibold tabular-nums">{step.value}</p>{index < journey.length - 1 && <span className="sr-only">then</span>}</div>;
            })}
          </div>
        </div>
        <div className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h3 className="text-sm font-semibold">Revenue by site</h3>
          <div className="mt-5 space-y-4">
            {revenue.sites.length === 0 ? <p className="text-sm text-muted-foreground">Revenue will appear here after your first payment.</p> : revenue.sites.map((site) => <div key={site.subdomain}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate text-muted-foreground">{site.subdomain}</span><span className="font-medium tabular-nums">{currency.format(site.generatedRevenueCents / 100)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(site.generatedRevenueCents > 0 ? 5 : 0, rate(site.generatedRevenueCents, maxSiteRevenue) * 100)}%` }} /></div></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
