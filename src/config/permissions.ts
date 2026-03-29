import type { Role } from '@/hooks/use-role'

/**
 * Action types that can be performed in the system
 */
export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage' // Full CRUD access

/**
 * Resource types in the system
 */
export type Resource =
  | 'users'
  | 'clubs'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'purchase-orders'
  | 'customers'
  | 'tasks'
  | 'dashboard'

/**
 * Purchase order status
 */
export type PurchaseOrderStatus = 'pending' | 'approved' | 'received' | 'cancelled'

/**
 * Permission rule structure
 */
interface PermissionRule {
  actions: Action[]
  condition?: (context?: any) => boolean
}

/**
 * Role permissions configuration
 */
interface RolePermissions {
  canAccess: string[] // Array of allowed routes ('*' means all routes)
  resources: Partial<Record<Resource, PermissionRule>>
}

/**
 * Complete permissions configuration for all roles
 */
export const permissions: Record<Role, RolePermissions> = {
  /**
   * ADMIN - Full access to everything
   */
  admin: {
    canAccess: ['*'], // Access to all routes
    resources: {
      users: { actions: ['manage'] },
      clubs: { actions: ['manage'] },
      products: { actions: ['manage'] },
      inventory: { actions: ['manage'] },
      sales: { actions: ['manage'] },
      'purchase-orders': { actions: ['manage'] },
      customers: { actions: ['manage'] },
      tasks: { actions: ['manage'] },
      dashboard: { actions: ['read'] },
    },
  },

  /**
   * MANAGER - Same as seller + user management + dashboard + limited purchase order editing
   */
  manager: {
    canAccess: [
      '/dashboard',
      '/products',
      '/inventory',
      '/sales',
      '/purchase-orders',
      '/purchase-orders/create',
      '/purchase-orders/:id',
      '/purchase-orders/:id/edit',
      '/users',
      '/users/create',
      '/customers',
      '/tasks',
      '/pos',
      '/pos/sales',
      '/pos/sales/new',
    ],
    resources: {
      // Can create users but only with role = seller
      users: {
        actions: ['create', 'read'],
        condition: (context) => {
          // For create action, ensure role is seller
          if (context?.action === 'create') {
            return context?.data?.role === 'seller'
          }
          return true
        },
      },
      products: { actions: ['read'] },
      inventory: { actions: ['read'] },
      sales: { actions: ['create', 'read'] },
      // Can only edit purchase orders if status = pending
      'purchase-orders': {
        actions: ['create', 'read', 'update'],
        condition: (context) => {
          // For update action, check if status is pending
          if (context?.action === 'update') {
            return context?.data?.status === 'pending'
          }
          return true
        },
      },
      customers: { actions: ['create', 'read'] },
      tasks: { actions: ['create', 'read', 'update'] },
      dashboard: { actions: ['read'] },
    },
  },

  /**
   * SELLER - Limited access
   */
  seller: {
    canAccess: [
      '/pos',
      '/pos/sales',
      '/pos/sales/new',
      '/products',
      '/inventory',
      '/sales',
      '/purchase-orders',
      '/purchase-orders/create',
      '/purchase-orders/:id', // View only
      '/customers',
      '/tasks',
    ],
    resources: {
      products: { actions: ['read'] },
      inventory: { actions: ['read'] },
      sales: { actions: ['create', 'read'] },
      'purchase-orders': { actions: ['create', 'read'] },
      customers: { actions: ['create', 'read'] },
      tasks: { actions: ['create', 'read'] },
    },
  },
}

/**
 * Check if a role can access a specific route
 *
 * @param role - User role
 * @param path - Route path to check
 * @returns true if user can access the route
 *
 * @example
 * if (canAccessRoute('seller', '/clubs')) {
 *   // Allow access
 * }
 */
export function canAccessRoute(role: Role | null, path: string): boolean {
  if (!role) return false

  const rolePermissions = permissions[role]

  // Admin has access to everything
  if (rolePermissions.canAccess.includes('*')) {
    return true
  }

  // Check exact match
  if (rolePermissions.canAccess.includes(path)) {
    return true
  }

  // Check pattern match for dynamic routes (e.g., /users/:id)
  return rolePermissions.canAccess.some((allowedPath) => {
    if (allowedPath.includes(':')) {
      const pattern = allowedPath.replace(/:[^/]+/g, '[^/]+')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(path)
    }
    return false
  })
}

/**
 * Check if a role can perform an action on a resource
 *
 * @param role - User role
 * @param resource - Resource name
 * @param action - Action to perform
 * @param context - Optional context for conditional permissions
 * @returns true if user can perform the action
 *
 * @example
 * if (canPerformAction('manager', 'purchase-orders', 'update', { data: { status: 'pending' } })) {
 *   // Allow edit
 * }
 */
export function canPerformAction(
  role: Role | null,
  resource: Resource,
  action: Action,
  context?: any
): boolean {
  if (!role) return false

  const rolePermissions = permissions[role]
  const resourcePermission = rolePermissions.resources[resource]

  if (!resourcePermission) return false

  // Check if role has 'manage' permission (full access)
  if (resourcePermission.actions.includes('manage')) {
    return true
  }

  // Check if role has the specific action
  if (!resourcePermission.actions.includes(action)) {
    return false
  }

  // Apply conditional check if exists
  if (resourcePermission.condition) {
    return resourcePermission.condition({ ...context, action })
  }

  return true
}

/**
 * Get allowed routes for a specific role
 *
 * @param role - User role
 * @returns Array of allowed route paths
 *
 * @example
 * const allowedRoutes = getAllowedRoutes('seller')
 * // ['/pos', '/products', '/inventory', ...]
 */
export function getAllowedRoutes(role: Role | null): string[] {
  if (!role) return []

  const rolePermissions = permissions[role]

  // If admin, return all routes indicator
  if (rolePermissions.canAccess.includes('*')) {
    return ['*']
  }

  return rolePermissions.canAccess
}

/**
 * Check if role can create users with specific role
 *
 * @param userRole - Current user's role
 * @param targetRole - Role to assign to new user
 * @returns true if user can create users with target role
 *
 * @example
 * if (canCreateUserWithRole('manager', 'seller')) {
 *   // Allow manager to create seller
 * }
 */
export function canCreateUserWithRole(
  userRole: Role | null,
  targetRole: Role
): boolean {
  if (!userRole) return false

  // Admin can create any role
  if (userRole === 'admin') return true

  // Manager can only create sellers
  if (userRole === 'manager' && targetRole === 'seller') return true

  return false
}

/**
 * Check if role can edit purchase order based on status
 *
 * @param role - User role
 * @param status - Purchase order status
 * @returns true if user can edit the purchase order
 *
 * @example
 * if (canEditPurchaseOrder('manager', 'pending')) {
 *   // Show edit button
 * }
 */
export function canEditPurchaseOrder(
  role: Role | null,
  status: PurchaseOrderStatus
): boolean {
  if (!role) return false

  // Admin can edit any status
  if (role === 'admin') return true

  // Manager can only edit pending
  if (role === 'manager' && status === 'pending') return true

  // Seller cannot edit
  return false
}
