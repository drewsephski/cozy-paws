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
          <DialogTitle className="text-xl">About this page</DialogTitle>
          <DialogDescription className="leading-6">
            This page was made with Sitterfolio. It lists the sitter&apos;s services and lets pet owners send an availability request.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><HeartHandshake className="size-4 text-emerald-600" aria-hidden="true" />For pet owners</div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Check services and service areas.</li>
              <li className="flex gap-2"><Send className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Send the dates and care details.</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Get a reply from the sitter.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><LayoutDashboard className="size-4 text-emerald-600" aria-hidden="true" />For pet sitters</div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Publish a profile without building a website.</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Share the same link with every client.</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Read new inquiries in the dashboard.</li>
            </ul>
          </section>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">Your request goes to the sitter on this page. Sitterfolio does not book or confirm care for them.</p>

        <DialogFooter>
          <DialogClose asChild><Button type="button">Got it</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
