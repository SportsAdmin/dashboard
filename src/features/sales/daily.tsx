import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { parseISODate, toISODate } from '@/lib/periods'
import { usePermissions } from '@/hooks/use-permissions'
import { ReportToolbar } from './components/report-toolbar'
import { SalesTable } from './components/sales-table'
import { PaymentBreakdown, SummaryCards } from './components/summary-cards'
import { ReportError, ReportLayout } from './report-layout'
import { useSalesReport } from './use-sales-report'

const route = getRouteApi('/_authenticated/sales/')

/** Daily cash: one local day, money per payment method, and that day's sales (paginated) */
export function DailySales() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { isAdmin } = usePermissions()

  const day = parseISODate(search.date)
  const date = toISODate(day)
  const page = search.page ?? 1
  const pageSize = search.size ?? 20
  const clubId = search.club ?? null

  const { summary, list } = useSalesReport({
    from: date,
    to: date,
    clubId,
    page,
    pageSize,
  })

  // Any filter change goes back to page 1
  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }) })

  const error = summary.error ?? list.error

  return (
    <ReportLayout
      title={t('sales.daily.title')}
      description={t('sales.daily.description')}
    >
      <ReportToolbar
        period='day'
        anchor={day}
        onAnchorChange={(d) => setSearch({ date: toISODate(d) })}
        showClubFilter={isAdmin()}
        clubId={clubId ?? ''}
        onClubChange={(club) => setSearch({ club: club || undefined })}
      />

      {error && <ReportError message={error.message} />}

      <SummaryCards summary={summary.data} loading={summary.isLoading} />

      <div className='grid gap-4 lg:grid-cols-3'>
        <div className='lg:col-span-1'>
          <PaymentBreakdown summary={summary.data} />
        </div>
        <div className='min-w-0 lg:col-span-2'>
          <SalesTable
            data={list.data}
            loading={list.isLoading}
            fetching={list.isFetching}
            showDate={false}
            showClub={isAdmin() && !clubId}
            onPageChange={(p) =>
              navigate({ search: (prev) => ({ ...prev, page: p }) })
            }
            onPageSizeChange={(size) => setSearch({ size })}
          />
        </div>
      </div>
    </ReportLayout>
  )
}
