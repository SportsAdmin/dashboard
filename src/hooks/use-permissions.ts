import { useRole } from './use-role'
import {
  canAccessRoute,
  canPerformAction,
  canCreateUserWithRole,
  canEditPurchaseOrder,
  type Role,
  type Action,
  type Resource,
  type PurchaseOrderStatus,
} from '@/config/permissions'

/**
 * Hook that provides permission checking utilities
 *
 * @returns Object with permission checking functions
 *
 * @example
 * function UserActions() {
 *   const { can, canAccess, canCreateUser, canEditPO } = usePermissions()
 *
 *   return (
 *     <>
 *       {canAccess('/users') && <Link to="/users">Users</Link>}
 *       {can('users', 'create') && <Button>Create User</Button>}
 *       {canCreateUser('seller') && <Button>Create Seller</Button>}
 *       {canEditPO('pending') && <Button>Edit Order</Button>}
 *     </>
 *   )
 * }
 */
export function usePermissions() {
  const { role, loading } = useRole()

  /**
   * Check if user can perform an action on a resource
   */
  const can = (resource: Resource, action: Action, context?: any): boolean => {
    if (loading) return false
    return canPerformAction(role, resource, action, context)
  }

  /**
   * Check if user can access a route
   */
  const canAccess = (path: string): boolean => {
    if (loading) return false
    return canAccessRoute(role, path)
  }

  /**
   * Check if user can create a user with specific role
   */
  const canCreateUser = (targetRole: Role): boolean => {
    if (loading) return false
    return canCreateUserWithRole(role, targetRole)
  }

  /**
   * Check if user can edit a purchase order based on its status
   */
  const canEditPO = (status: PurchaseOrderStatus): boolean => {
    if (loading) return false
    return canEditPurchaseOrder(role, status)
  }

  /**
   * Check if current user is admin
   */
  const isAdmin = (): boolean => {
    return role === 'admin'
  }

  /**
   * Check if current user is manager
   */
  const isManager = (): boolean => {
    return role === 'manager'
  }

  /**
   * Check if current user is seller
   */
  const isSeller = (): boolean => {
    return role === 'seller'
  }

  /**
   * Check if user has one of the specified roles
   */
  const hasRole = (...roles: Role[]): boolean => {
    if (!role) return false
    return roles.includes(role)
  }

  return {
    role,
    loading,
    can,
    canAccess,
    canCreateUser,
    canEditPO,
    isAdmin,
    isManager,
    isSeller,
    hasRole,
  }
}

/**
 * Higher-order component that conditionally renders based on permission
 *
 * @example
 * // Show button only if user can create products
 * <Can resource="products" action="create">
 *   <Button>Create Product</Button>
 * </Can>
 *
 * @example
 * // Show different content based on permission
 * <Can resource="users" action="delete" fallback={<div>No access</div>}>
 *   <Button variant="destructive">Delete User</Button>
 * </Can>
 */
interface CanProps {
  resource: Resource
  action: Action
  context?: any
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function Can({ resource, action, context, children, fallback = null }: CanProps) {
  const { can } = usePermissions()

  if (!can(resource, action, context)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component that conditionally renders based on role
 *
 * @example
 * // Show content only for admin and manager
 * <HasRole roles={['admin', 'manager']}>
 *   <AdminPanel />
 * </HasRole>
 *
 * @example
 * // Show different content for different roles
 * <HasRole roles={['admin']} fallback={<div>Admin only</div>}>
 *   <SuperAdminPanel />
 * </HasRole>
 */
interface HasRoleProps {
  roles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function HasRole({ roles, children, fallback = null }: HasRoleProps) {
  const { hasRole } = usePermissions()

  if (!hasRole(...roles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component that conditionally renders based on route access
 *
 * @example
 * // Show link only if user can access the route
 * <CanAccessRoute path="/clubs">
 *   <Link to="/clubs">Clubs</Link>
 * </CanAccessRoute>
 */
interface CanAccessRouteProps {
  path: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function CanAccessRoute({ path, children, fallback = null }: CanAccessRouteProps) {
  const { canAccess } = usePermissions()

  if (!canAccess(path)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
