'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col', className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn('flex min-h-11 items-end gap-6 border-b', className)} {...props} />;
}

function TabsTrigger({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn("group relative -mb-px inline-flex min-h-11 items-center justify-center gap-2 px-1 text-sm font-medium text-muted-foreground transition-colors after:absolute after:inset-x-1 after:bottom-0 after:h-px after:bg-transparent after:content-[''] hover:text-foreground focus-visible:z-10 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground", className)}
      {...props}
    >
      {children}
      <motion.span
        layoutId="tabs-active-indicator"
        className="absolute inset-x-1 bottom-0 h-px bg-foreground group-data-[state=inactive]:hidden"
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        aria-hidden="true"
      />
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
