import type { Role } from '@/hooks/use-role'

// Re-export Role for convenience
export type { Role } from '@/hooks/use-role'

/**
 * Action types that can be performed in the system
 */
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage' // Full CRUD access

/**
 * Resource types in the system
 */
export type Resource =
  | 'users'
  | 'clubs'
  | 'products'
  | 'sizes'
  | 'inventory' // 'update' = manual stock adjustment (adjust_stock)
  | 'sales'
  | 'returns' // 'delete' = cancel a return (delete_return)
  | 'purchase-orders' // 'update' includes changing status / receiving goods
  | 'customers'
  | 'tasks'
  | 'dashboard'

/**
 * Purchase order status (must match purchase_orders_status_check in the DB)
 */
export type PurchaseOrderStatus =
  | 'pending'
  | 'approved'
  | 'in_production'
  | 'shipped'
  | 'delivered'

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
 * Delivered orders are final: stock was already applied, items and status are
 * locked in the DB (trigger lock_delivered_purchase_order_items).
 */
const notDelivered = (context?: any) =>
  context?.action !== 'update' || context?.data?.status !== 'delivered'

/**
 * Complete permissions configuration for all roles.
 *
 * MIRRORS THE DATABASE (RLS policies + RPC role checks). The DB is the source of
 * truth; this only decides what the UI shows. Keep both in sync:
 *   supabase/migrations/*_harden_rls.sql, *_fix_stock_flows.sql,
 *   *_returns_management.sql, *_role_alignment.sql
 *
 * Scope: admin = every club; manager / seller = only their own club.
 */
export const permissions: Record<Role, RolePermissions> = {
  /**
   * ADMIN - Everything, on every club
   */
  admin: {
    canAccess: ['*'], // Access to all routes
    resources: {
      users: { actions: ['manage'] },
      clubs: { actions: ['manage'] },
      products: { actions: ['manage'] },
      sizes: { actions: ['manage'] },
      inventory: { actions: ['read', 'update'] },
      sales: { actions: ['create', 'read'] },
      returns: { actions: ['create', 'read', 'delete'] },
      // No 'delete': purchase orders can't be deleted (no DELETE policy)
      'purchase-orders': {
        actions: ['create', 'read', 'update'],
        condition: notDelivered,
      },
      customers: { actions: ['manage'] },
      tasks: { actions: ['manage'] },
      dashboard: { actions: ['read'] },
    },
  },

  /**
   * MANAGER - Runs their club: sells, receives goods, adjusts stock,
   * edits products, creates sellers, cancels returns
   */
  manager: {
    canAccess: [
      '/',
      '/dashboard',
      '/products',
      '/inventory',
      '/sales',
      '/purchase-orders',
      '/purchase-orders/create',
      '/purchase-orders/:id',
      '/users',
      '/users/create',
      '/customers',
      '/pos',
      '/pos/new',
      '/returns',
      '/settings',
    ],
    resources: {
      // Can create users but only with role = seller (edge function create-user)
      users: {
        actions: ['create', 'read'],
        condition: (context) => {
          if (context?.action === 'create') {
            return context?.data?.role === 'seller'
          }
          return true
        },
      },
      products: { actions: ['create', 'read', 'update'] },
      sizes: { actions: ['read'] },
      inventory: { actions: ['read', 'update'] },
      sales: { actions: ['create', 'read'] },
      returns: { actions: ['create', 'read', 'delete'] },
      // Can edit (and receive) any order of their club until it is delivered
      'purchase-orders': {
        actions: ['create', 'read', 'update'],
        condition: notDelivered,
      },
      customers: { actions: ['create', 'read', 'update'] },
      dashboard: { actions: ['read'] },
    },
  },

  /**
   * SELLER - Sells, registers returns, creates products and purchase orders
   */
  seller: {
    canAccess: [
      '/',
      '/dashboard',
      '/pos',
      '/pos/new',
      '/returns',
      '/products',
      '/inventory',
      '/sales',
      '/purchase-orders',
      '/purchase-orders/create',
      '/purchase-orders/:id', // View only
      '/customers',
      '/settings',
    ],
    resources: {
      products: { actions: ['create', 'read'] },
      sizes: { actions: ['read'] },
      inventory: { actions: ['read'] },
      sales: { actions: ['create', 'read'] },
      returns: { actions: ['create', 'read'] },
      'purchase-orders': { actions: ['create', 'read'] },
      customers: { actions: ['create', 'read', 'update'] },
      dashboard: { actions: ['read'] },
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
  return canPerformAction(role, 'purchase-orders', 'update', {
    data: { status },
  })
}
