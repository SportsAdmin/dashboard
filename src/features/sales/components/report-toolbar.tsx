import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  dateLocale,
  isCurrentOrFuture,
  periodLabel,
  shiftPeriod,
  type Period,
} from '@/lib/periods'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClubSelect } from '@/components/club-select'

type ReportToolbarProps = {
  period: Period
  /** Periods the user can switch between; omit for a fixed period (daily cash) */
  periods?: Period[]
  anchor: Date
  onPeriodChange?: (period: Period) => void
  onAnchorChange: (anchor: Date) => void
  /** Admins can narrow the report to one club */
  showClubFilter: boolean
  clubId: string
  onClubChange: (clubId: string) => void
  disabled?: boolean
}

export function ReportToolbar({
  period,
  periods,
  anchor,
  onPeriodChange,
  onAnchorChange,
  showClubFilter,
  clubId,
  onClubChange,
  disabled,
}: ReportToolbarProps) {
  const { t } = useTranslation()
  const atPresent = isCurrentOrFuture(period, anchor)

  return (
    <div className='flex flex-wrap items-end justify-between gap-4'>
      <div className='flex flex-wrap items-center gap-3'>
        {periods && onPeriodChange && (
          <Tabs
            value={period}
            onValueChange={(value) => onPeriodChange(value as Period)}
          >
            <TabsList>
              {periods.map((p) => (
                <TabsTrigger key={p} value={p} disabled={disabled}>
                  {t(`sales.period.${p}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon'
            aria-label={t('sales.previousPeriod')}
            disabled={disabled}
            onClick={() => onAnchorChange(shiftPeriod(period, anchor, -1))}
          >
            <ChevronLeft className='size-4' />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className='min-w-52 justify-start font-medium capitalize'
              >
                <CalendarIcon className='me-2 size-4 opacity-60' />
                {periodLabel(period, anchor)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                locale={dateLocale()}
                selected={anchor}
                defaultMonth={anchor}
                disabled={(date) => date > new Date()}
                onSelect={(date) => date && onAnchorChange(date)}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant='outline'
            size='icon'
            aria-label={t('sales.nextPeriod')}
            disabled={disabled || atPresent}
            onClick={() => onAnchorChange(shiftPeriod(period, anchor, 1))}
          >
            <ChevronRight className='size-4' />
          </Button>

          {!atPresent && (
            <Button
              variant='ghost'
              disabled={disabled}
              onClick={() => onAnchorChange(new Date())}
            >
              {t(period === 'day' ? 'sales.today' : 'sales.current')}
            </Button>
          )}
        </div>
      </div>

      {showClubFilter && (
        <div className='w-full sm:w-64'>
          <ClubSelect
            id='report-club'
            value={clubId}
            onChange={onClubChange}
            allowAll
          />
        </div>
      )}
    </div>
  )
}
