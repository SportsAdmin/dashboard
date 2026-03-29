import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLayout } from '@/context/layout-provider'
import { useRole } from '@/hooks/useRole'
import { filterSidebarByRole } from '@/lib/sidebar-filter'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { getSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { i18n } = useTranslation()
  const { role } = useRole()

  // Get fresh sidebar data when language changes
  const sidebarData = getSidebarData()

  // Filter sidebar navigation based on user role
  const filteredNavGroups = useMemo(() => {
    if (!role) return []
    return filterSidebarByRole(sidebarData.navGroups, role)
  }, [sidebarData.navGroups, role])

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent key={i18n.language}>
        {filteredNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
