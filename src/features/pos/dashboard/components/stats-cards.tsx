import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react'

export function StatsCards() {
  const { t } = useTranslation()
  // Mock data
  const stats = {
    salesToday: 2450.75,
    revenueThisMonth: 42850.50,
    lowStockProducts: 12,
    totalOrders: 156,
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('pos.dashboard.salesToday')}
          </CardTitle>
          <DollarSign className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            ${stats.salesToday.toFixed(2)}
          </div>
          <p className='text-xs text-muted-foreground'>
            +12.5% {t('pos.dashboard.fromYesterday')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('pos.dashboard.revenueThisMonth')}
          </CardTitle>
          <TrendingUp className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            ${stats.revenueThisMonth.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className='text-xs text-muted-foreground'>
            +18.2% {t('pos.dashboard.fromLastMonth')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('pos.dashboard.lowStockProducts')}
          </CardTitle>
          <AlertTriangle className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{stats.lowStockProducts}</div>
          <p className='text-xs text-muted-foreground'>
            {t('pos.dashboard.requiresAttention')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('pos.dashboard.totalOrders')}
          </CardTitle>
          <ShoppingCart className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{stats.totalOrders}</div>
          <p className='text-xs text-muted-foreground'>
            +8 {t('pos.dashboard.sinceLastHour')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
