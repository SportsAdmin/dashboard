import { useCallback, useEffect, useState } from 'react'
import { getReturns, type ReturnRecord } from '@/services/returns'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NewReturnDialog } from './components/new-return-dialog'
import { ReturnsTable } from './components/returns-table'

export function Returns() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const [returns, setReturns] = useState<ReturnRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchReturns = useCallback(
    () =>
      getReturns()
        .then((data) => {
          setReturns(data)
          setError(null)
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    void fetchReturns()
  }, [fetchReturns])

  const load = () => {
    setLoading(true)
    void fetchReturns()
  }

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
              {t('returns.title')}
            </h2>
            <p className='text-muted-foreground'>{t('returns.description')}</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            {t('returns.newReturn')}
          </Button>
        </div>

        {loading && (
          <p className='py-8 text-center text-muted-foreground'>
            {t('returns.loading')}
          </p>
        )}

        {error && (
          <p className='py-8 text-center text-destructive'>
            {t('common.error')}: {error}
          </p>
        )}

        {!loading && !error && returns.length === 0 && (
          <div className='py-12 text-center'>
            <p className='text-lg font-medium text-muted-foreground'>
              {t('returns.empty')}
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>
              {t('returns.emptyHint')}
            </p>
          </div>
        )}

        {!loading && !error && returns.length > 0 && (
          <ReturnsTable
            data={returns}
            canDelete={can('returns', 'delete')}
            onChanged={load}
          />
        )}
      </Main>

      <NewReturnDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={load}
      />
    </>
  )
}
