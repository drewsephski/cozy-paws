import { Check } from 'lucide-react';

export function LeadSubmissionConfirmation({ sitterName }: { sitterName: string }) {
  return (
    <div role="status" className="flex flex-1 flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
      <div>
        <div className="mb-5 grid size-11 place-items-center rounded-full bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950">
          <Check className="size-6" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-300">Request sent</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your request is with {sitterName}.</h2>
        <p className="mt-3 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
          {sitterName} received your care details and will reply to you by email.
        </p>
      </div>
      <div className="mt-8 border-t border-emerald-200 pt-5 dark:border-emerald-800">
        <p className="text-sm font-semibold">What happens next</p>
        <p className="mt-1 text-sm leading-5 text-emerald-800 dark:text-emerald-200">Keep an eye on your inbox for availability and next steps.</p>
      </div>
    </div>
  );
}
