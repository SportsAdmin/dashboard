import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { ClubsTable } from './clubs-table'

export function ClubsList() {
  const navigate = useNavigate()

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
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Clubs</h1>
            <p className='text-muted-foreground'>
              Manage your organization's clubs
            </p>
          </div>
          <Button onClick={() => navigate({ to: '/clubs/create' })}>
            <Plus className='mr-2 h-4 w-4' />
            Create Club
          </Button>
        </div>

        <ClubsTable />
      </Main>
    </>
  )
}
