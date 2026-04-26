import { Role } from '@/store/useAuthStore'

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(role: Role | null, route: string): boolean {
  if (!role) return false

  // Admin has access to everything
  if (role === 'admin') return true

  // Define route restrictions
  const restrictedRoutes: Record<string, Role[]> = {
    '/users': ['admin', 'manager'],
    '/clubs': ['admin'],
    '/clubs/create': ['admin'],
    '/tasks': ['admin'],
    '/apps': ['admin'],
    '/chats': ['admin'],
  }

  // Check if route is restricted
  const allowedRoles = restrictedRoutes[route]
  if (!allowedRoles) return true // Route is not restricted

  return allowedRoles.includes(role)
}

/**
 * Check if a role can create users
 * Only admin and manager can create users (and only seller role)
 */
export function canCreateUsers(role: Role | null): boolean {
  if (!role) return false
  return role === 'admin' || role === 'manager'
}

/**
 * Check if a role can delete users
 * Only admin can delete users
 */
export function canDeleteUsers(role: Role | null): boolean {
  if (!role) return false
  return role === 'admin'
}

/**
 * Check if a role can edit a purchase order based on its status
 * - Admin: can edit everything
 * - Manager: can edit only if status === 'pending'
 * - Seller: cannot edit
 */
export function canEditPurchaseOrder(
  role: Role | null,
  status: 'pending' | 'approved' | 'in_production' | 'shipped' | 'delivered'
): boolean {
  if (!role) return false

  if (role === 'admin') return true
  if (role === 'manager') return status === 'pending'

  return false
}

/**
 * Check if a role can delete purchase orders
 * Only admin can delete purchase orders
 */
export function canDeletePurchaseOrder(role: Role | null): boolean {
  if (!role) return false
  return role === 'admin'
}

/**
 * Check if a role can access clubs management
 */
export function canManageClubs(role: Role | null): boolean {
  if (!role) return false
  return role === 'admin'
}

/**
 * Check if a role can view a specific page/feature
 */
export function canView(role: Role | null, feature: string): boolean {
  if (!role) return false

  // Admin can view everything
  if (role === 'admin') return true

  const restrictions: Record<string, Role[]> = {
    users: ['admin', 'manager'],
    clubs: ['admin'],
    'purchase-orders': ['admin', 'manager', 'seller'],
    products: ['admin', 'manager', 'seller'],
    inventory: ['admin', 'manager', 'seller'],
    pos: ['admin', 'manager', 'seller'],
    customers: ['admin', 'manager', 'seller']
  }

  const allowedRoles = restrictions[feature]
  if (!allowedRoles) return true

  return allowedRoles.includes(role)
}

/**
 * Helper to check multiple permissions at once
 */
export function hasPermission(
  role: Role | null,
  permission: 'create-users' | 'delete-users' | 'manage-clubs' | 'edit-pending-po' | 'delete-po'
): boolean {
  switch (permission) {
    case 'create-users':
      return canCreateUsers(role)
    case 'delete-users':
      return canDeleteUsers(role)
    case 'manage-clubs':
      return canManageClubs(role)
    case 'edit-pending-po':
      return canEditPurchaseOrder(role, 'pending')
    case 'delete-po':
      return canDeletePurchaseOrder(role)
    default:
      return false
  }
}
