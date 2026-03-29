import { ReactNode } from 'react'
import { Navigate, useLocation } from '@tanstack/react-router'
import { useRole } from '@/hooks/useRole'
import { canAccessRoute } from '@/lib/permissions'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Role } from '@/store/useAuthStore'

interface ProtectedRouteProps {
  children: ReactNode
  /**
   * Optional: Specific roles allowed to access this route
   * If not provided, will use permissions.ts configuration
   */
  allowedRoles?: Role[]
  /**
   * Optional: Redirect path if user is not authenticated
   * @default '/login'
   */
  redirectTo?: string
}

/**
 * ProtectedRoute Component
 *
 * Wraps route content and handles authorization based on user role.
 *
 * Features:
 * - Shows loading state while fetching user role
 * - Redirects to login if not authenticated
 * - Shows unauthorized page if user doesn't have access
 * - Checks route permissions from permissions.ts config
 * - Supports explicit allowedRoles prop for custom restrictions
 *
 * @example
 * // Basic usage - checks permissions.ts config
 * <ProtectedRoute>
 *   <UsersPage />
 * </ProtectedRoute>
 *
 * @example
 * // Explicit role restriction
 * <ProtectedRoute allowedRoles={['admin', 'manager']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { role, loading } = useRole()
  const location = useLocation()

  // Loading state
  if (loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-2'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
          <p className='text-sm text-muted-foreground'>Loading...</p>
        </div>
      </div>
    )
  }

  // No role (not authenticated)
  if (!role) {
    return <Navigate to={redirectTo} search={{ redirect: location.pathname }} />
  }

  // Check explicit allowed roles if provided
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <UnauthorizedPage userRole={role} />
  }

  // Check permissions from config
  const hasAccess = canAccessRoute(role, location.pathname)
  if (!hasAccess) {
    return <UnauthorizedPage userRole={role} />
  }

  // User has access, render children
  return <>{children}</>
}

/**
 * Unauthorized Page Component
 *
 * Displayed when user doesn't have permission to access a route
 */
interface UnauthorizedPageProps {
  userRole: Role
}

function UnauthorizedPage({ userRole }: UnauthorizedPageProps) {
  return (
    <div className='flex h-screen w-full items-center justify-center p-4'>
      <Card className='max-w-md'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <div className='rounded-full bg-destructive/10 p-2'>
              <ShieldAlert className='h-6 w-6 text-destructive' />
            </div>
            <div>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You don't have permission to access this page</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-2 text-sm'>
            <p>
              Your current role <span className='font-semibold'>({userRole})</span> doesn't have
              access to this resource.
            </p>
            <p className='text-muted-foreground'>
              If you believe this is an error, please contact your administrator.
            </p>
          </div>
        </CardContent>
        <CardFooter className='flex gap-2'>
          <Button variant='outline' onClick={() => window.history.back()}>
            Go Back
          </Button>
          <Button onClick={() => (window.location.href = '/dashboard')}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * Hook to check if current user can access a specific path
 *
 * @param path - Path to check
 * @returns true if user can access the path
 *
 * @example
 * const canAccess = useCanAccessRoute('/clubs')
 * if (canAccess) {
 *   // Show link to clubs page
 * }
 */
export function useCanAccessRoute(path: string): boolean {
  const { role } = useRole()
  return canAccessRoute(role, path)
}
