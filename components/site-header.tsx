import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { SignOutButton } from '@/components/sign-out-button';

export function SiteHeader({ dashboard = false, signedIn = false, className }: { dashboard?: boolean; signedIn?: boolean; className?: string }) {
  return (
    <header className={cn('border-b border-border/70 bg-background/90 backdrop-blur', className)}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-emerald-700 text-white shadow-sm dark:bg-emerald-400 dark:text-emerald-950"><PawPrint aria-hidden="true" className="size-4" /></span>
          Sitterfolio
        </Link>
        <nav aria-label="Primary navigation" className="flex items-center gap-1 sm:gap-3">
          {signedIn ? (
            <>
              <Link href={dashboard ? '/' : '/admin'} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {dashboard ? 'Home' : 'Sitter dashboard'}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/auth" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Sign in</Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
