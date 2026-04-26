import type { Role } from '@/store/useAuthStore'
import { canAccessRoute } from '@/lib/permissions'
import type { NavGroup, NavItem } from '@/components/layout/types'

/**
 * Filter sidebar navigation items based on user role
 *
 * Recursively filters nav items and their children based on permissions
 *
 * @param navGroups - Array of navigation groups from sidebar
 * @param role - Current user role
 * @returns Filtered navigation groups
 *
 * @example
 * const sidebarData = getSidebarData()
 * const filteredGroups = filterSidebarByRole(sidebarData.navGroups, 'seller')
 */
export function filterSidebarByRole(
  navGroups: NavGroup[],
  role: Role | null
): NavGroup[] {
  if (!role) return []

  return navGroups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, role),
    }))
    .filter((group) => group.items.length > 0) // Remove empty groups
}

/**
 * Filter individual navigation items based on role
 *
 * @param items - Array of navigation items
 * @param role - Current user role
 * @returns Filtered navigation items
 */
function filterNavItems(items: NavItem[], role: Role): NavItem[] {
  return items
    .map((item) => {
      // First, check if item has roles restriction
      if (item.roles && item.roles.length > 0) {
        if (!item.roles.includes(role)) {
          return null // User's role not in allowed roles
        }
      }

      // If item has children, filter them recursively
      if (item.items && item.items.length > 0) {
        const filteredChildren = filterNavItems(item.items, role)

        // If no children pass the filter, exclude this parent item
        if (filteredChildren.length === 0) {
          return null
        }

        return {
          ...item,
          items: filteredChildren,
        }
      }

      // For leaf items, check if user can access the URL
      if (item.url) {
        const hasAccess = canAccessRoute(role, item.url)
        return hasAccess ? item : null
      }

      // Keep items without URLs (like headers/dividers)
      return item
    })
    .filter((item): item is NavItem => item !== null)
}

/**
 * Get role-specific sidebar items that should always be hidden
 *
 * @param role - Current user role
 * @returns Array of URLs to hide from sidebar
 */
export function getHiddenRoutes(role: Role): string[] {
  const hiddenByRole: Record<Role, string[]> = {
    admin: [],
    manager: ['/clubs', '/clubs/create'],
    seller: ['/clubs', '/clubs/create', '/users', '/users/create'],
  }

  return hiddenByRole[role] || []
}

/**
 * Check if a specific nav item should be visible for a role
 *
 * @param item - Navigation item to check
 * @param role - Current user role
 * @returns true if item should be visible
 *
 * @example
 * if (shouldShowNavItem(navItem, 'seller')) {
 *   // Render nav item
 * }
 */
export function shouldShowNavItem(item: NavItem, role: Role | null): boolean {
  if (!role) return false

  // Check if item has roles restriction
  if (item.roles && item.roles.length > 0) {
    if (!item.roles.includes(role)) {
      return false // User's role not in allowed roles
    }
  }

  // If item has URL, check permissions
  if (item.url) {
    return canAccessRoute(role, item.url)
  }

  // If item has children, show if at least one child is visible
  if (item.items && item.items.length > 0) {
    return item.items.some((child) => shouldShowNavItem(child, role))
  }

  // Show items without URLs or children (headers, dividers, etc.)
  return true
}
