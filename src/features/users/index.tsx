import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { useUsers } from '@/hooks/useUsers'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const homeNavigate = useNavigate()
  const { users, loading, error, hasAccess, currentUserRole } = useUsers()

  // Show loading state
  if (loading) {
    return (
      <>
        <Header fixed>
          <Search />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>

        <Main className='flex flex-1 flex-col items-center justify-center gap-4'>
          <div className='text-center'>
            <p className='text-muted-foreground'>Loading users...</p>
          </div>
        </Main>
      </>
    )
  }

  // Show unauthorized message if user doesn't have access
  if (!hasAccess) {
    return (
      <>
        <Header fixed>
          <Search />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>

        <Main className='flex flex-1 flex-col items-center justify-center gap-4'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold tracking-tight'>Access Denied</h2>
            <p className='text-muted-foreground mt-2'>
              You do not have permission to access user management.
            </p>
            <p className='text-sm text-muted-foreground mt-1'>
              {currentUserRole === 'seller'
                ? 'Sellers cannot view user lists.'
                : 'Please contact your administrator for access.'}
            </p>
            <Button
              className='mt-4'
              onClick={() => homeNavigate({ to: '/dashboard' })}
            >
              Go to Dashboard
            </Button>
          </div>
        </Main>
      </>
    )
  }

  // Show error message if there's an error
  if (error) {
    return (
      <>
        <Header fixed>
          <Search />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>

        <Main className='flex flex-1 flex-col items-center justify-center gap-4'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold tracking-tight text-destructive'>
              Error
            </h2>
            <p className='text-muted-foreground mt-2'>{error}</p>
          </div>
        </Main>
      </>
    )
  }

  return (
    <UsersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
            <p className='text-muted-foreground'>
              Manage your users and their roles here.
              {currentUserRole === 'manager' && (
                <span className='block text-sm mt-1'>
                  Showing users from your club only.
                </span>
              )}
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
        <UsersTable data={users} search={search} navigate={navigate} />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
