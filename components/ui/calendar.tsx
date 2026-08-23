"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit p-3", className)}
      classNames={{
        root: cn("relative", defaultClassNames.root),
        months: cn("flex flex-col gap-4 sm:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-3 flex items-center justify-between px-3", defaultClassNames.nav),
        button_previous: cn("grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", defaultClassNames.button_previous),
        button_next: cn("grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", defaultClassNames.button_next),
        month_caption: cn("flex h-9 items-center justify-center px-10", defaultClassNames.month_caption),
        caption_label: cn("text-sm font-semibold", defaultClassNames.caption_label),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn("w-10 py-1 text-center text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground", defaultClassNames.weekday),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        day: cn("relative size-10 p-0 text-center text-sm [&:has([data-selected-single=true])]:rounded-lg [&:has([data-range-start=true])]:rounded-l-lg [&:has([data-range-end=true])]:rounded-r-lg", defaultClassNames.day),
        day_button: cn("grid size-10 place-items-center rounded-lg font-normal transition hover:bg-accent hover:text-accent-foreground focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none", defaultClassNames.day_button),
        selected: cn("[&_button]:bg-primary [&_button]:font-semibold [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground", defaultClassNames.selected),
        range_start: cn("rounded-l-lg bg-primary [&_button]:bg-primary [&_button]:font-semibold [&_button]:text-primary-foreground", defaultClassNames.range_start),
        range_middle: cn("rounded-none bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100 [&_button]:rounded-none [&_button]:hover:bg-emerald-200 dark:[&_button]:hover:bg-emerald-900", defaultClassNames.range_middle),
        range_end: cn("rounded-r-lg bg-primary [&_button]:bg-primary [&_button]:font-semibold [&_button]:text-primary-foreground", defaultClassNames.range_end),
        today: cn("[&_button]:border [&_button]:border-emerald-500 [&_button]:font-semibold", defaultClassNames.today),
        outside: cn("text-muted-foreground/45", defaultClassNames.outside),
        disabled: cn("text-muted-foreground/30 line-through", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : orientation === "up" ? ChevronUp : ChevronDown
          return <Icon className={cn("size-4", chevronClassName)} aria-hidden="true" />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
