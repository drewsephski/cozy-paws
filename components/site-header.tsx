import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { SignOutButton } from '@/components/sign-out-button';

export function SiteHeader({ dashboard = false, floating = false, signedIn = false, className }: { dashboard?: boolean; floating?: boolean; signedIn?: boolean; className?: string }) {
  return (
    <header className={cn(floating ? 'fixed inset-x-0 top-4 z-50 px-3' : 'border-b border-border/70 bg-background/90 backdrop-blur', className)}>
      <div className={cn('mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 lg:px-8', floating && 'h-14 max-w-3xl rounded-2xl border border-border/70 bg-background/90 shadow-[0_16px_50px_-28px_rgba(0,0,0,.45)] backdrop-blur-xl lg:px-5')}>
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Image src="/brand/sitterfolio-paw.png" alt="" width={36} height={36} priority className="size-9" />
          Sitterfolio
        </Link>
        <nav aria-label="Primary navigation" className="flex items-center gap-1 sm:gap-3">
          {signedIn ? (
            <>
              <Link href={dashboard ? '/' : '/admin'} className={cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', floating && !dashboard ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
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
