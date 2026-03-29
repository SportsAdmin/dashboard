import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

/**
 * Valid user roles in the system
 */
export type Role = 'admin' | 'manager' | 'seller'

/**
 * User profile with role information
 */
export interface UserProfile {
  id: string
  role: Role
  name: string
  club_id: string | null
}

interface UseRoleReturn {
  role: Role | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching and managing current user's role
 *
 * Features:
 * - Fetches user profile from Supabase
 * - Provides role information for RBAC
 * - Automatic data fetching on mount
 * - Loading and error states
 * - Refetch functionality
 *
 * @returns {UseRoleReturn} User role, profile, loading state, error, and refetch function
 *
 * @example
 * function ProtectedComponent() {
 *   const { role, loading } = useRole()
 *
 *   if (loading) return <Loader />
 *   if (role !== 'admin') return <Unauthorized />
 *
 *   return <AdminContent />
 * }
 */
export function useRole(): UseRoleReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserRole = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Not authenticated')
        setProfile(null)
        return
      }

      // Fetch user profile with role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, name, club_id')
        .eq('id', user.id)
        .single<Profile>()

      if (profileError) {
        setError(`Failed to fetch profile: ${profileError.message}`)
        setProfile(null)
        return
      }

      if (!profileData) {
        setError('Profile not found')
        setProfile(null)
        return
      }

      // Validate role
      const validRoles: Role[] = ['admin', 'manager', 'seller']
      if (!validRoles.includes(profileData.role as Role)) {
        setError(`Invalid role: ${profileData.role}`)
        setProfile(null)
        return
      }

      setProfile({
        id: profileData.id,
        role: profileData.role as Role,
        name: profileData.name,
        club_id: profileData.club_id,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserRole()
  }, [])

  return {
    role: profile?.role || null,
    profile,
    loading,
    error,
    refetch: fetchUserRole,
  }
}
