import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  parseISODate,
  periodRange,
  toISODate,
  type Period,
} from '@/lib/periods'
import { usePermissions } from '@/hooks/use-permissions'
import { ReportToolbar } from './components/report-toolbar'
import { SalesTable } from './components/sales-table'
import {
  SeriesTable,
  SellersTable,
  TopProducts,
} from './components/summary-breakdowns'
import { PaymentBreakdown, SummaryCards } from './components/summary-cards'
import { ReportError, ReportLayout } from './report-layout'
import { useSalesReport } from './use-sales-report'

const route = getRouteApi('/_authenticated/sales/summary')
const PERIODS: Period[] = ['week', 'month', 'year']

/** Sales summary for a week, month or year. Every filter queries the DB again. */
export function SalesSummaryPage() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { isAdmin } = usePermissions()

  const period = search.period ?? 'month'
  const anchor = parseISODate(search.date)
  const range = periodRange(period, anchor)
  const from = toISODate(range.from)
  const to = toISODate(range.to)
  const page = search.page ?? 1
  const pageSize = search.size ?? 20
  const clubId = search.club ?? null

  const { summary, list } = useSalesReport({ from, to, clubId, page, pageSize })

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }) })

  const error = summary.error ?? list.error

  return (
    <ReportLayout
      title={t('sales.summary.title')}
      description={t('sales.summary.description')}
    >
      <ReportToolbar
        period={period}
        periods={PERIODS}
        anchor={anchor}
        // PERIODS only offers week / month / year
        onPeriodChange={(p) =>
          setSearch({ period: p as Exclude<Period, 'day'> })
        }
        onAnchorChange={(d) => setSearch({ date: toISODate(d) })}
        showClubFilter={isAdmin()}
        clubId={clubId ?? ''}
        onClubChange={(club) => setSearch({ club: club || undefined })}
        disabled={summary.isFetching && !summary.data}
      />

      {error && <ReportError message={error.message} />}

      <SummaryCards summary={summary.data} loading={summary.isLoading} />

      {summary.data && (
        <>
          <div className='grid gap-4 lg:grid-cols-3'>
            <div className='min-w-0 lg:col-span-2'>
              <SeriesTable summary={summary.data} />
            </div>
            <div className='flex flex-col gap-4'>
              <PaymentBreakdown summary={summary.data} />
              <SellersTable summary={summary.data} />
            </div>
          </div>
          <TopProducts summary={summary.data} />
        </>
      )}

      <SalesTable
        data={list.data}
        loading={list.isLoading}
        fetching={list.isFetching}
        showDate
        showClub={isAdmin() && !clubId}
        onPageChange={(p) =>
          navigate({ search: (prev) => ({ ...prev, page: p }) })
        }
        onPageSizeChange={(size) => setSearch({ size })}
      />
    </ReportLayout>
  )
}
