import { useTranslation } from 'react-i18next'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { CreateClubForm } from './create-club-form'

export function CreateClub() {
  const { t } = useTranslation()

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <LanguageSwitcher />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold tracking-tight'>
            {t('clubs.pageTitle')}
          </h1>
          <p className='text-muted-foreground'>
            {t('clubs.pageDescription')}
          </p>
        </div>

        <CreateClubForm />
      </Main>
    </>
  )
}
