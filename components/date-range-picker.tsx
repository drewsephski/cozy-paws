"use client"

import * as React from "react"
import { CalendarDays, ChevronDown } from '@/components/ui/animated-icons'
import type { DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const longDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

function toCalendarDate(date?: Date) {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function selectionLabel(range?: DateRange, selectingEnd = false) {
  if (!range?.from) return "Choose care dates"
  if (selectingEnd || !range.to) return `${longDate.format(range.from)} — choose an end date`
  if (toCalendarDate(range.from) === toCalendarDate(range.to)) return longDate.format(range.from)
  return `${shortDate.format(range.from)} – ${longDate.format(range.to)}`
}

export function DateRangePicker({
  compact = false,
  required = false,
  className,
  defaultStartDate,
  defaultEndDate,
}: {
  compact?: boolean
  required?: boolean
  className?: string
  defaultStartDate?: string
  defaultEndDate?: string
}) {
  const initialRange = React.useMemo<DateRange | undefined>(() => {
    if (!defaultStartDate) return undefined
    const from = new Date(`${defaultStartDate}T00:00:00`)
    const to = defaultEndDate ? new Date(`${defaultEndDate}T00:00:00`) : from
    return Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) ? undefined : { from, to }
  }, [defaultEndDate, defaultStartDate])
  const [range, setRange] = React.useState<DateRange | undefined>(initialRange)
  const [open, setOpen] = React.useState(false)
  const [selectingEnd, setSelectingEnd] = React.useState(false)

  React.useEffect(() => {
    setRange(initialRange)
    setSelectingEnd(false)
  }, [initialRange])

  function selectRange(next: DateRange | undefined) {
    setRange(next)
    if (!next?.from) {
      setSelectingEnd(false)
      return
    }
    if (!selectingEnd) {
      setSelectingEnd(true)
      return
    }
    if (next.to) {
      setSelectingEnd(false)
      setOpen(false)
    }
  }

  function useOneDay() {
    if (!range?.from) return
    setRange({ from: range.from, to: range.from })
    setSelectingEnd(false)
    setOpen(false)
  }

  function clearRange() {
    setRange(undefined)
    setSelectingEnd(false)
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <span className={cn("block font-medium", compact ? "text-xs" : "text-sm")}>Care dates</span>
      <input type="hidden" name="startDate" value={toCalendarDate(range?.from)} required={required} />
      <input type="hidden" name="endDate" value={selectingEnd ? "" : toCalendarDate(range?.to)} required={required} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Care dates: ${selectionLabel(range, selectingEnd)}`}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-input bg-background px-3 text-left shadow-xs outline-none transition hover:border-emerald-400 hover:bg-emerald-50/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-emerald-950/20",
              compact ? "h-11 text-sm" : "min-h-12 text-sm",
            )}
          >
            <span className={cn("grid shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", compact ? "size-7" : "size-8")}> 
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
            <span className={cn("min-w-0 flex-1 truncate", !range?.from && "text-muted-foreground")}>{selectionLabel(range, selectingEnd)}</span>
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={12} className="w-auto max-w-[calc(100vw-1.5rem)] rounded-2xl p-0 shadow-xl">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">When is care needed?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose the first and last day of care.</p>
          </div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={selectRange}
            defaultMonth={range?.from}
            numberOfMonths={1}
            className="mx-auto [--cell-size:2.5rem]"
          />
          {range?.from && (
            <div className="flex items-center justify-between gap-3 border-t bg-muted/35 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">{selectionLabel(range, selectingEnd)}</p>
              <div className="flex shrink-0 items-center gap-3">
                {selectingEnd && <button type="button" onClick={useOneDay} className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Just this day</button>}
                <button type="button" onClick={clearRange} className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">Clear</button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
