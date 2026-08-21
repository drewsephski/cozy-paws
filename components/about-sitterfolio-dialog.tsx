'use client';

import { Check, HeartHandshake, Info, LayoutDashboard, PawPrint, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

export function AboutSitterfolioDialog({ businessName }: { businessName: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group flex items-center gap-2 rounded-md text-left text-sm font-semibold outline-none transition hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-4 dark:hover:text-emerald-300">
          <PawPrint className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <span className="max-w-52 truncate">{businessName}</span>
          <Info className="size-3.5 text-muted-foreground opacity-60 transition group-hover:opacity-100" aria-hidden="true" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-5 sm:max-w-xl sm:p-6">
        <DialogHeader className="pr-7 text-left">
          <div className="mb-1 grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <PawPrint className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl">A simpler way to connect over pet care</DialogTitle>
          <DialogDescription className="leading-6">
            This is a Sitterfolio—a shareable pet-care profile where sitters introduce their services and pet owners can ask about availability directly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><HeartHandshake className="size-4 text-emerald-600" aria-hidden="true" />For pet owners</div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Review services and service areas.</li>
              <li className="flex gap-2"><Send className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Send dates and care details in one place.</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Hear back directly from the sitter.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><LayoutDashboard className="size-4 text-emerald-600" aria-hidden="true" />For pet sitters</div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Create a polished profile without building a website.</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Share one memorable site link anywhere.</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Review new inquiries from a simple dashboard.</li>
            </ul>
          </section>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">Availability requests go to the sitter whose profile you’re viewing. Sitterfolio does not book or confirm care on their behalf.</p>

        <DialogFooter>
          <DialogClose asChild><Button type="button">Got it</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
