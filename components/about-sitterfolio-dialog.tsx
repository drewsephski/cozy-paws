'use client';

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Globe2,
  HeartHandshake,
  Inbox,
  Info,
  LayoutDashboard,
  MapPin,
  MessageCircleReply,
  PawPrint,
  Share2
} from '@/components/ui/animated-icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

const ownerBenefits = [
  { icon: MapPin, label: 'See services and service area' },
  { icon: CalendarDays, label: 'Share dates and care needs' },
  { icon: MessageCircleReply, label: 'Hear back from the sitter' }
];

const sitterBenefits = [
  { icon: Globe2, label: 'Publish a polished profile' },
  { icon: Share2, label: 'Share one client-ready link' },
  { icon: Inbox, label: 'Keep inquiries in one place' }
];

function BenefitList({ benefits }: { benefits: typeof ownerBenefits }) {
  return (
    <ul className="mt-3 space-y-2.5">
      {benefits.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
          <span className="whitespace-nowrap">{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function AboutSitterfolioDialog({
  businessName,
  siteHref,
  sitterfolioHref
}: {
  businessName: string;
  siteHref: string;
  sitterfolioHref: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group flex min-h-11 items-center gap-2 rounded-md text-left text-sm font-semibold outline-none transition hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-4 dark:hover:text-emerald-300">
          <PawPrint className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <span className="max-w-52 truncate">{businessName}</span>
          <Info className="size-3.5 text-muted-foreground opacity-60 transition group-hover:opacity-100" aria-hidden="true" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-5 sm:max-w-2xl sm:p-6">
        <DialogHeader className="pr-7 text-left">
          <div className="mb-1 grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <PawPrint className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl">A direct line to your sitter</DialogTitle>
          <DialogDescription className="leading-6">
            {businessName} uses Sitterfolio to share care details and handle availability requests.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><HeartHandshake className="size-4 text-emerald-600" aria-hidden="true" />For pet owners</div>
            <BenefitList benefits={ownerBenefits} />
          </section>

          <section className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><LayoutDashboard className="size-4 text-emerald-600" aria-hidden="true" />For pet sitters</div>
            <BenefitList benefits={sitterBenefits} />
          </section>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">Requests go straight to {businessName}. Sitterfolio does not book or confirm care.</p>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost" className="justify-start px-2 text-muted-foreground">
            <a href={sitterfolioHref} target="_blank" rel="noopener noreferrer">
              Visit Sitterfolio <ArrowUpRight aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
          <Button asChild>
            <a href={siteHref}><ArrowLeft aria-hidden="true" />Back to sitter&apos;s site</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
