import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { PurchaseOrdersTable } from './components/purchase-orders-table'
import { usePurchaseOrders } from '@/hooks/use-purchase-orders'

export function PurchaseOrders() {
  const { t } = useTranslation()
  const { purchaseOrders, loading, error } = usePurchaseOrders()

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitcher />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('purchaseOrders.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('purchaseOrders.description')}
            </p>
          </div>
          <Link to='/purchase-orders/create'>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              {t('purchaseOrders.createOrder')}
            </Button>
          </Link>
        </div>

        {loading && (
          <div className='flex items-center justify-center py-8'>
            <p className='text-muted-foreground'>{t('purchaseOrders.loadingOrders')}</p>
          </div>
        )}

        {error && (
          <div className='flex items-center justify-center py-8'>
            <p className='text-destructive'>{t('common.error')}: {error}</p>
          </div>
        )}

        {!loading && !error && purchaseOrders.length === 0 && (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <p className='text-lg font-medium text-muted-foreground'>
              {t('purchaseOrders.noOrdersYet')}
            </p>
            <p className='text-sm text-muted-foreground mt-2'>
              {t('purchaseOrders.createFirstOrder')}
            </p>
          </div>
        )}

        {!loading && !error && purchaseOrders.length > 0 && (
          <PurchaseOrdersTable data={purchaseOrders} />
        )}
      </Main>
    </>
  )
}
