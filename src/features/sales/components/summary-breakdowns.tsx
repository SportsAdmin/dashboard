import { format, parseISO } from 'date-fns'
import type { SalesSummary } from '@/services/reports'
import { useTranslation } from 'react-i18next'
import { dateLocale } from '@/lib/periods'
import { formatMoney } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** Sales per day (week / month) or per month (year), including empty buckets */
export function SeriesTable({ summary }: { summary: SalesSummary }) {
  const { t } = useTranslation()
  const locale = dateLocale()
  const max = Math.max(...summary.series.map((s) => Number(s.amount)), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>
          {summary.bucket === 'month'
            ? t('sales.series.byMonth')
            : t('sales.series.byDay')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='max-h-[420px] overflow-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {summary.bucket === 'month'
                    ? t('sales.series.month')
                    : t('sales.series.day')}
                </TableHead>
                <TableHead className='text-end'>
                  {t('sales.cards.sales')}
                </TableHead>
                <TableHead className='text-end'>
                  {t('sales.list.total')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.series.map((row) => {
                const amount = Number(row.amount)
                return (
                  <TableRow
                    key={row.bucket}
                    className={
                      amount === 0 ? 'text-muted-foreground' : undefined
                    }
                  >
                    <TableCell className='whitespace-nowrap capitalize'>
                      {format(
                        parseISO(row.bucket),
                        summary.bucket === 'month' ? 'MMMM' : 'EEE d MMM',
                        {
                          locale,
                        }
                      )}
                    </TableCell>
                    <TableCell className='text-end tabular-nums'>
                      {row.sales}
                    </TableCell>
                    <TableCell className='w-1/2'>
                      <div className='flex items-center justify-end gap-3'>
                        <div className='hidden h-2 flex-1 overflow-hidden rounded-full bg-muted sm:block'>
                          <div
                            className='h-full rounded-full bg-primary'
                            style={{
                              width: max > 0 ? `${(amount / max) * 100}%` : 0,
                            }}
                          />
                        </div>
                        <span className='w-28 text-end tabular-nums'>
                          {formatMoney(amount)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export function TopProducts({ summary }: { summary: SalesSummary }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>
          {t('sales.topProducts.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary.top_products.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {t('sales.list.empty')}
          </p>
        ) : (
          <ol className='divide-y'>
            {summary.top_products.map((p, i) => (
              <li
                key={i}
                className='flex items-center justify-between gap-3 py-2 text-sm'
              >
                <span className='min-w-0'>
                  <span className='me-2 text-muted-foreground tabular-nums'>
                    {i + 1}.
                  </span>
                  {[p.product, p.size, p.color].filter(Boolean).join(' ')}
                </span>
                <span className='shrink-0 text-end tabular-nums'>
                  <span className='font-medium'>
                    {t('sales.topProducts.units', { count: Number(p.units) })}
                  </span>
                  <span className='ms-2 text-muted-foreground'>
                    {formatMoney(Number(p.amount))}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function SellersTable({ summary }: { summary: SalesSummary }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{t('sales.bySeller.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {summary.by_seller.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {t('sales.list.empty')}
          </p>
        ) : (
          <ul className='divide-y'>
            {summary.by_seller.map((s) => (
              <li
                key={s.seller_id ?? 'none'}
                className='flex items-center justify-between gap-3 py-2 text-sm'
              >
                <span>{s.seller}</span>
                <span className='text-end tabular-nums'>
                  <span className='text-muted-foreground'>
                    {t('sales.byMethod.salesCount', { count: s.sales })}
                  </span>
                  <span className='ms-3 font-medium'>
                    {formatMoney(Number(s.amount))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
