'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spokes } from '@/components/ui/spokes';
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

export function DeleteSiteDialog({
  subdomain,
  siteUrl,
  action,
  isPending
}: {
  subdomain: string;
  siteUrl: string;
  action: (formData: FormData) => void;
  isPending: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete ${subdomain}`}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden rounded-xl border-border p-0 shadow-2xl sm:max-w-sm">
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-start gap-3 pr-7">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle aria-hidden="true" className="size-4" />
            </div>
            <DialogHeader className="gap-1.5 text-left">
              <DialogTitle className="text-lg tracking-tight">Delete this site?</DialogTitle>
              <DialogDescription className="text-xs leading-5">
                Your public site will stop working immediately. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2">
            <p className="truncate font-mono text-xs font-medium text-foreground">{siteUrl}</p>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-5 py-3 sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isPending}>Keep site</Button>
          </DialogClose>
          <form action={action}>
            <input type="hidden" name="subdomain" value={subdomain} />
            <Button type="submit" variant="destructive" disabled={isPending} className={`group/delete w-full transition-transform duration-150 active:scale-95 sm:w-auto ${isPending ? 'animate-pulse' : ''}`}>
              {isPending ? <Spokes aria-hidden="true" /> : <Trash2 aria-hidden="true" className="transition-transform duration-200 group-hover/delete:translate-y-0.5 group-hover/delete:rotate-6" />}
              {isPending ? 'Deleting...' : 'Delete site'}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
