'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
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
      <DialogContent className="gap-0 overflow-hidden rounded-xl border-border p-0 shadow-2xl sm:max-w-md">
        <div className="border-b border-border px-6 pb-5 pt-6">
          <div className="mb-5 grid size-10 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </div>
          <DialogHeader className="gap-2 pr-8 text-left">
            <DialogTitle className="text-xl tracking-tight">Delete this site?</DialogTitle>
            <DialogDescription className="leading-6">
              Your public site will stop working immediately. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="bg-muted/40 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-[.14em] text-muted-foreground">Site to delete</p>
          <p className="mt-1 truncate font-mono text-sm font-medium text-foreground">{siteUrl}</p>
        </div>

        <DialogFooter className="border-t border-border bg-background px-6 py-4 sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isPending}>Keep site</Button>
          </DialogClose>
          <form action={action}>
            <input type="hidden" name="subdomain" value={subdomain} />
            <Button type="submit" variant="destructive" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
              {isPending ? 'Deleting…' : 'Delete site'}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
