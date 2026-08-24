'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col', className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState<{ left: number; width: number } | null>(null);

  const measure = React.useCallback(() => {
    const list = listRef.current;
    const activeTrigger = list?.querySelector<HTMLElement>('[data-state="active"]');
    if (!list || !activeTrigger) return setIndicator(null);
    const listRect = list.getBoundingClientRect();
    const triggerRect = activeTrigger.getBoundingClientRect();
    setIndicator({ left: triggerRect.left - listRect.left, width: triggerRect.width });
  }, []);

  React.useLayoutEffect(() => {
    measure();
    const list = listRef.current;
    if (!list) return;
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(list);
    list.querySelectorAll('[role="tab"]').forEach((tab) => resizeObserver.observe(tab));
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(list, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
    window.addEventListener('resize', measure);
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn('relative flex min-h-11 items-end gap-6 border-b', className)}
      {...props}
    >
      {props.children}
      {indicator && (
        <motion.span
          initial={false}
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="pointer-events-none absolute bottom-0 z-20 h-px bg-foreground"
          aria-hidden="true"
        />
      )}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn("relative z-10 -mb-px inline-flex min-h-11 items-center justify-center gap-2 px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground", className)}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
