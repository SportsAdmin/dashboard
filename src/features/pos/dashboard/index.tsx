import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { StatsCards } from './components/stats-cards'
import { SalesChart } from './components/sales-chart'
import { RecentSalesTable } from './components/recent-sales-table'

export function PosDashboard() {
  const { t } = useTranslation()

  const topNav = [
    {
      title: t('pos.topNav.panel'),
      href: '/pos',
      isActive: true,
      disabled: false,
    },
    {
      title: t('pos.topNav.newSale'),
      href: '/pos/new',
      isActive: false,
      disabled: false,
    },
    {
      title: t('pos.topNav.history'),
      href: '/pos/history',
      isActive: false,
      disabled: true,
    },
  ]

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
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
          <h1 className='text-2xl font-bold tracking-tight'>
            {t('pos.dashboard.title')}
          </h1>
        </div>

        <div className='space-y-4'>
          {/* Stats Cards */}
          <StatsCards />

          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t('pos.dashboard.salesChart')}</CardTitle>
            </CardHeader>
            <CardContent className='ps-2'>
              <SalesChart />
            </CardContent>
          </Card>

          {/* Recent Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('pos.dashboard.recentSales')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentSalesTable />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
