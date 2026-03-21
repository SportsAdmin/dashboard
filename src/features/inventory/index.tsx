import { useTranslation } from 'react-i18next'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { InventoryTable } from './components/inventory-table'
import { useInventory } from '@/hooks/use-inventory'

export function Inventory() {
  const { t } = useTranslation()
  const { inventory, loading, error } = useInventory()

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
              {t('inventory.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('inventory.description')}
            </p>
          </div>
        </div>

        {loading && (
          <div className='flex items-center justify-center py-8'>
            <p className='text-muted-foreground'>{t('common.loading')}</p>
          </div>
        )}

        {error && (
          <div className='flex items-center justify-center py-8'>
            <p className='text-destructive'>
              {t('common.error')}: {error}
            </p>
          </div>
        )}

        {!loading && !error && <InventoryTable data={inventory} />}
      </Main>
    </>
  )
}
