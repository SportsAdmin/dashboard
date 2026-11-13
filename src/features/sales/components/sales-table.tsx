import { format } from 'date-fns'
import type { SalesPage } from '@/services/reports'
import { useTranslation } from 'react-i18next'
import { dateLocale } from '@/lib/periods'
import { cn, formatMoney } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pager } from '@/components/pager'

type SalesTableProps = {
  data?: SalesPage
  loading: boolean
  /** True while a new page/filter is being fetched (previous rows stay visible) */
  fetching: boolean
  /** Show the date (multi-day periods) or only the time (daily cash) */
  showDate: boolean
  showClub: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function SalesTable({
  data,
  loading,
  fetching,
  showDate,
  showClub,
  onPageChange,
  onPageSizeChange,
}: SalesTableProps) {
  const { t } = useTranslation()
  const locale = dateLocale()

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>
          {t('sales.list.title')}
          {data && (
            <span className='ms-2 font-normal text-muted-foreground'>
              ({data.total_count})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div
          className={cn(
            'overflow-x-auto rounded-md border transition-opacity',
            fetching && 'opacity-60'
          )}
          aria-busy={fetching}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='whitespace-nowrap'>
                  {showDate ? t('sales.list.date') : t('sales.list.time')}
                </TableHead>
                <TableHead>{t('sales.list.sale')}</TableHead>
                {showClub && <TableHead>{t('sales.list.club')}</TableHead>}
                <TableHead>{t('sales.list.products')}</TableHead>
                <TableHead>{t('sales.list.payment')}</TableHead>
                <TableHead>{t('sales.list.seller')}</TableHead>
                <TableHead className='text-end'>
                  {t('sales.list.total')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='py-8 text-center text-muted-foreground'
                  >
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              )}
              {data && data.rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='py-8 text-center text-muted-foreground'
                  >
                    {t('sales.list.empty')}
                  </TableCell>
                </TableRow>
              )}
              {data?.rows.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className='whitespace-nowrap tabular-nums'>
                    {format(
                      new Date(sale.created_at),
                      showDate ? 'dd/MM/yyyy HH:mm' : 'HH:mm',
                      {
                        locale,
                      }
                    )}
                  </TableCell>
                  <TableCell className='whitespace-nowrap'>
                    <span className='font-mono text-sm'>#{sale.number}</span>
                    {sale.returned_units > 0 && (
                      <Badge variant='secondary' className='ms-2'>
                        {t('sales.list.returned', {
                          count: sale.returned_units,
                        })}
                      </Badge>
                    )}
                  </TableCell>
                  {showClub && <TableCell>{sale.club ?? '—'}</TableCell>}
                  <TableCell className='min-w-48'>
                    <ul className='space-y-0.5 text-sm'>
                      {sale.items.map((item, i) => (
                        <li key={i}>
                          {item.quantity} ×{' '}
                          {[item.product, item.size, item.color]
                            .filter(Boolean)
                            .join(' ')}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className='text-sm whitespace-nowrap'>
                    {sale.payments.map((p, i) => (
                      <div key={i}>
                        {t(`pos.sales.payment.${p.method}`)}
                        {sale.payments.length > 1 && (
                          <span className='text-muted-foreground'>
                            {' '}
                            {formatMoney(Number(p.amount))}
                          </span>
                        )}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {sale.seller ?? '—'}
                  </TableCell>
                  <TableCell className='text-end font-semibold tabular-nums'>
                    {formatMoney(Number(sale.total))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data && data.total_count > 0 && (
          <Pager
            page={data.page}
            pageCount={data.page_count}
            pageSize={data.page_size}
            totalCount={data.total_count}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            disabled={fetching}
          />
        )}
      </CardContent>
    </Card>
  )
}
