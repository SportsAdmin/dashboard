import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import i18n from '@/lib/i18n'

export type Period = 'day' | 'week' | 'month' | 'year'

/** Weeks start on Monday (same as Postgres date_trunc('week')) */
const WEEK = { weekStartsOn: 1 as const }

export const dateLocale = () => (i18n.language?.startsWith('en') ? enUS : es)

/** 'yyyy-MM-dd' for a local calendar day (what the DB expects) */
export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd')

export const parseISODate = (value: string | undefined) => {
  if (!value) return new Date()
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function periodRange(
  period: Period,
  anchor: Date
): { from: Date; to: Date } {
  switch (period) {
    case 'day':
      return { from: anchor, to: anchor }
    case 'week':
      return { from: startOfWeek(anchor, WEEK), to: endOfWeek(anchor, WEEK) }
    case 'month':
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) }
    case 'year':
      return { from: startOfYear(anchor), to: endOfYear(anchor) }
  }
}

export function shiftPeriod(period: Period, anchor: Date, step: 1 | -1): Date {
  switch (period) {
    case 'day':
      return addDays(anchor, step)
    case 'week':
      return addWeeks(anchor, step)
    case 'month':
      return addMonths(anchor, step)
    case 'year':
      return addYears(anchor, step)
  }
}

/** Human label, e.g. "jueves 13 de noviembre", "10 – 16 nov 2026", "noviembre 2026", "2026" */
export function periodLabel(period: Period, anchor: Date): string {
  const locale = dateLocale()
  const { from, to } = periodRange(period, anchor)
  switch (period) {
    case 'day':
      return format(anchor, "EEEE d 'de' MMMM yyyy", { locale })
    case 'week':
      return from.getMonth() === to.getMonth()
        ? `${format(from, 'd', { locale })} – ${format(to, 'd MMM yyyy', { locale })}`
        : `${format(from, 'd MMM', { locale })} – ${format(to, 'd MMM yyyy', { locale })}`
    case 'month':
      return format(anchor, 'MMMM yyyy', { locale })
    case 'year':
      return format(anchor, 'yyyy', { locale })
  }
}

/** True when the period contains today (no point in moving forward) */
export function isCurrentOrFuture(period: Period, anchor: Date): boolean {
  return periodRange(period, anchor).to >= new Date(new Date().toDateString())
}
