import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/useAuthStore'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Protected Route Component
 *
 * Wraps content that requires authentication.
 * If user is not authenticated, redirects to login page.
 *
 * @param children - Content to protect
 * @param redirectTo - Path to redirect to after login (default: current path)
 *
 * @example
 * <ProtectedRoute>
 *   <DashboardContent />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  redirectTo,
}: ProtectedRouteProps) {
  const user = useAuthStore(state => state.user)
  const loading = useAuthStore(state => state.loading)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login with current path as redirect param
      const currentPath = redirectTo || window.location.pathname
      navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    }
  }, [user, loading, navigate, redirectTo])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='flex flex-col items-center gap-2'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show nothing (will redirect)
  if (!user) {
    return null
  }

  // User is authenticated, render children
  return <>{children}</>
}
