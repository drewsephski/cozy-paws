import { PawPrint } from 'lucide-react';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { SiteHeader } from '@/components/site-header';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata;

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-5 py-12">
        <section className="w-full max-w-md rounded-xl bg-card p-6 ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_18px_50px_-36px_rgba(0,0,0,.35)] sm:p-8">
          <span className="mb-6 grid size-10 place-items-center rounded-xl bg-emerald-700 text-white"><PawPrint aria-hidden="true" className="size-5" /></span>
          <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter a new password for your Sitterfolio account.</p>
          <div className="mt-7"><Suspense fallback={<p className="text-sm text-muted-foreground">Loading reset form...</p>}><ResetPasswordForm /></Suspense></div>
        </section>
      </main>
    </div>
  );
}
