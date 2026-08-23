import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

function Stat({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="stat" className={cn('relative grid gap-3 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-24px_rgba(0,0,0,.35)]', className)} {...props} />;
}

function StatLabel({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="stat-label" className={cn('text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground', className)} {...props} />;
}

const indicatorVariants = cva('grid shrink-0 place-items-center', {
  variants: {
    variant: {
      default: '',
      icon: 'size-9 rounded-xl',
      badge: 'min-h-7 rounded-full px-2.5 text-xs font-medium',
      action: 'size-9 rounded-xl border',
    },
    color: {
      default: 'bg-muted text-muted-foreground',
      success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      info: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      error: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    },
  },
  defaultVariants: { variant: 'default', color: 'default' },
});

function StatIndicator({ className, variant, color, ...props }: React.ComponentProps<'div'> & VariantProps<typeof indicatorVariants>) {
  return <div data-slot="stat-indicator" data-variant={variant} data-color={color} className={cn(indicatorVariants({ variant, color }), className)} {...props} />;
}

function StatValue({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="stat-value" className={cn('text-3xl font-semibold tabular-nums tracking-[-0.04em]', className)} {...props} />;
}

function StatTrend({ className, trend = 'neutral', ...props }: React.ComponentProps<'p'> & { trend?: 'up' | 'down' | 'neutral' }) {
  return <p data-slot="stat-trend" data-trend={trend} className={cn('flex items-center gap-1.5 text-xs font-medium', trend === 'up' && 'text-emerald-700 dark:text-emerald-300', trend === 'down' && 'text-red-700 dark:text-red-300', trend === 'neutral' && 'text-muted-foreground', className)} {...props} />;
}

function StatSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="stat-separator" role="separator" className={cn('h-px bg-border', className)} {...props} />;
}

function StatDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="stat-description" className={cn('text-sm leading-5 text-muted-foreground', className)} {...props} />;
}

export { Stat, StatLabel, StatIndicator, StatValue, StatTrend, StatSeparator, StatDescription };
