import type { SalesSummary } from '@/services/reports'
import type { PaymentMethod } from '@/services/sales'
import { ArrowLeftRight, Banknote, CreditCard, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const METHOD_ICON: Record<PaymentMethod, React.ElementType> = {
  cash: Banknote,
  transfer: ArrowLeftRight,
  card: CreditCard,
  mercadopago: Wallet,
}
const METHOD_ORDER: PaymentMethod[] = [
  'cash',
  'transfer',
  'card',
  'mercadopago',
]

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className='gap-2 py-4'>
      <CardHeader className='px-4'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className='px-4'>
        <div className='text-2xl font-bold tabular-nums'>{value}</div>
        {hint && <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function SummaryCards({
  summary,
  loading,
}: {
  summary?: SalesSummary
  loading: boolean
}) {
  const { t } = useTranslation()

  if (loading && !summary) {
    return (
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-[104px] rounded-xl' />
        ))}
      </div>
    )
  }
  if (!summary) return null

  const { totals, returns } = summary
  return (
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
      <Stat
        label={t('sales.cards.amount')}
        value={formatMoney(Number(totals.amount))}
      />
      <Stat label={t('sales.cards.sales')} value={String(totals.sales)} />
      <Stat
        label={t('sales.cards.avgTicket')}
        value={formatMoney(Number(totals.avg_ticket))}
      />
      <Stat
        label={t('sales.cards.units')}
        value={String(totals.units)}
        hint={
          returns.count > 0
            ? t('sales.cards.returnsHint', {
                count: returns.count,
                units: returns.units,
              })
            : undefined
        }
      />
    </div>
  )
}

/** Money per payment method. Split payments count in each method they used. */
export function PaymentBreakdown({ summary }: { summary?: SalesSummary }) {
  const { t } = useTranslation()
  if (!summary) return null

  const byMethod = new Map(summary.by_method.map((m) => [m.method, m]))
  const methods = METHOD_ORDER.filter(
    (m) => m !== 'mercadopago' || byMethod.has(m)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{t('sales.byMethod.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className='divide-y'>
          {methods.map((method) => {
            const row = byMethod.get(method)
            const Icon = METHOD_ICON[method]
            return (
              <li
                key={method}
                className='flex items-center justify-between gap-3 py-2.5'
              >
                <span className='flex items-center gap-2'>
                  <Icon className='size-4 text-muted-foreground' />
                  {t(`pos.sales.payment.${method}`)}
                  {row && (
                    <span className='text-xs text-muted-foreground'>
                      {t('sales.byMethod.salesCount', { count: row.sales })}
                    </span>
                  )}
                </span>
                <span className='font-semibold tabular-nums'>
                  {formatMoney(Number(row?.amount ?? 0))}
                </span>
              </li>
            )
          })}
        </ul>
        <p className='mt-3 text-xs text-muted-foreground'>
          {t('sales.byMethod.splitHint')}
        </p>
      </CardContent>
    </Card>
  )
}
