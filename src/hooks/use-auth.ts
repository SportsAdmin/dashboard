import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { login as authLogin, logout as authLogout } from '@/services/auth'
import { getProfile, type Profile } from '@/services/profile'
import type { User } from '@supabase/supabase-js'

interface UseAuthReturn {
  user: User | null
  profile: Profile | null
  role: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<{
    success: boolean
    error?: string
  }>
  logout: () => Promise<{ success: boolean; error?: string }>
}

/**
 * Custom hook for managing authentication state
 *
 * Features:
 * - User state management
 * - User profile with name, role, and club_id
 * - Loading state during auth operations
 * - Auto-sync with Supabase auth state changes
 * - Automatic profile fetching after login
 * - Login and logout functions
 *
 * @returns {UseAuthReturn} Auth state and functions
 *
 * @example
 * function MyComponent() {
 *   const { user, profile, role, loading, login, logout } = useAuth()
 *
 *   if (loading) return <div>Loading...</div>
 *
 *   if (user && profile) {
 *     return (
 *       <div>
 *         <p>Welcome {profile.name}</p>
 *         <p>Role: {role}</p>
 *         <p>Email: {user.email}</p>
 *         <button onClick={logout}>Logout</button>
 *       </div>
 *     )
 *   }
 *
 *   return (
 *     <button onClick={() => login('user@example.com', 'password')}>
 *       Login
 *     </button>
 *   )
 * }
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    // Fetch user profile (optional - app works without it)
    const fetchProfile = async (userId: string) => {
      try {
        const response = await getProfile(userId)
        if (mounted) {
          if (response.success && response.profile) {
            setProfile(response.profile)
          } else {
            // Profile not found is OK - user can still use the app
            console.warn('Profile not found for user:', userId)
            setProfile(null)
          }
        }
      } catch (error) {
        // Profile fetch failed - app still works
        console.warn('Error fetching profile:', error)
        if (mounted) {
          setProfile(null)
        }
      }
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (mounted) {
          setUser(session?.user ?? null)

          // Try to fetch profile if user exists (don't wait for it)
          if (session?.user) {
            // Don't await - fetch profile in background
            fetchProfile(session.user.id).catch((error) => {
              console.warn('Background profile fetch failed:', error)
            })
          }

          // Always set loading to false - don't wait for profile
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      setUser(session?.user ?? null)

      // Try to fetch profile if user exists (don't wait for it)
      if (session?.user) {
        // Don't await - fetch profile in background
        fetchProfile(session.user.id).catch((error) => {
          console.warn('Background profile fetch failed:', error)
        })
      } else {
        setProfile(null)
      }

      // Always set loading to false immediately - don't wait for profile
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array - only run once

  /**
   * Login with email and password
   */
  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      setLoading(true)
      try {
        const response = await authLogin(email, password)

        if (response.success) {
          // User state will be updated by onAuthStateChange listener
          return { success: true }
        }

        return {
          success: false,
          error: response.error || 'Login failed',
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Logout current user
   */
  const logout = useCallback(async (): Promise<{
    success: boolean
    error?: string
  }> => {
    setLoading(true)
    try {
      const response = await authLogout()

      if (response.success) {
        // User state will be updated by onAuthStateChange listener
        return { success: true }
      }

      return {
        success: false,
        error: response.error || 'Logout failed',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    login,
    logout,
  }
}
