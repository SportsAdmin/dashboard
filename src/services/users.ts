import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { Profile } from '@/types'

/**
 * Valid user roles in the system
 */
export type UserRole = 'admin' | 'manager' | 'seller'

/**
 * User data structure combining profile and auth information
 */
export interface User {
  id: string
  name: string
  email: string | null
  role: UserRole
  club_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Current user profile with role and club information
 */
interface CurrentUserProfile {
  id: string
  role: UserRole
  club_id: string | null
}

/**
 * Get current user's profile with role and club information from store
 * Used for role-based access control - uses cached profile from store to avoid duplicate requests
 */
function getCurrentUserProfile(): CurrentUserProfile | null {
  const { profile } = useAuthStore.getState()

  if (!profile) {
    return null
  }

  return {
    id: profile.id,
    role: profile.role as UserRole,
    club_id: profile.club_id,
  }
}

/**
 * Fetch users from Supabase with role-based filtering
 *
 * Role-based access rules:
 * - admin: Can see ALL users from all clubs
 * - manager: Can ONLY see users from their own club
 * - seller: Not allowed to access user list
 *
 * @returns Array of users with profile and email information
 * @throws Error if user is not authenticated or not authorized
 *
 * @example
 * // As admin - fetch all users
 * const users = await getUsers()
 *
 * @example
 * // As manager - fetch only users from same club
 * const users = await getUsers()
 */
export async function getUsers(): Promise<User[]> {
  // Get current user's profile to determine access level from store
  const currentProfile = getCurrentUserProfile()

  if (!currentProfile) {
    throw new Error('Unable to fetch current user profile')
  }

  // Sellers are not allowed to access user list
  if (currentProfile.role === 'seller') {
    throw new Error('Unauthorized: Sellers cannot access user list')
  }

  // Build query based on role
  let query = supabase
    .from('profiles')
    .select('id, name, role, club_id, created_at, updated_at')
    .order('created_at', { ascending: false })

  // Managers can only see users from their own club
  if (currentProfile.role === 'manager') {
    if (!currentProfile.club_id) {
      throw new Error('Manager must be assigned to a club')
    }
    query = query.eq('club_id', currentProfile.club_id)
  }

  // Admins can see all users (no additional filter needed)

  const { data: profiles, error: profilesError } = await query

  if (profilesError) {
    throw new Error(`Failed to fetch users: ${profilesError.message}`)
  }

  if (!profiles) {
    return []
  }

  // Map profiles to users
  // Note: Email is set to null as it's not stored in profiles table
  // If emails are needed, they should be added to the profiles table
  // or fetched via a secure server-side function
  const users: User[] = (profiles as Profile[]).map((profile) => ({
    id: profile.id,
    name: profile.name,
    email: null, // Email not available in profiles table
    role: profile.role as UserRole,
    club_id: profile.club_id,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  }))

  return users
}

/**
 * Check if current user has permission to access user management
 *
 * @returns Object with access permission and user role
 *
 * @example
 * const { hasAccess, role } = await checkUserAccess()
 * if (!hasAccess) {
 *   return <Unauthorized />
 * }
 */
export function checkUserAccess(): {
  hasAccess: boolean
  role: UserRole | null
} {
  try {
    const profile = getCurrentUserProfile()

    if (!profile) {
      return { hasAccess: false, role: null }
    }

    // Only admin and manager can access user management
    const hasAccess = profile.role === 'admin' || profile.role === 'manager'

    return {
      hasAccess,
      role: profile.role,
    }
  } catch (error) {
    console.error('Error checking user access:', error)
    return { hasAccess: false, role: null }
  }
}

/**
 * Create a new user with profile
 *
 * @param data User creation data
 * @returns Result of user creation
 *
 * @example
 * const result = await createUser({
 *   email: 'seller@example.com',
 *   password: 'SecurePass123',
 *   name: 'John Seller',
 *   role: 'seller',
 *   club_id: 'club-uuid'
 * })
 */
export async function createUser(data: {
  email: string
  password: string
  name: string
  role: UserRole
  club_id?: string
}): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // Get current user's profile to validate permissions
    const currentProfile = getCurrentUserProfile()

    if (!currentProfile) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate permissions
    // - Managers can only create sellers in their club
    // - Admins can create any role
    if (currentProfile.role === 'manager') {
      if (data.role !== 'seller') {
        return { success: false, error: 'Managers can only create sellers' }
      }
      // Ensure the new user is in the same club as the manager
      if (!currentProfile.club_id) {
        return { success: false, error: 'Manager must be assigned to a club' }
      }
      // Override club_id to ensure it's the manager's club
      data.club_id = currentProfile.club_id
    } else if (currentProfile.role === 'seller') {
      return { success: false, error: 'Sellers cannot create users' }
    }

    // Call Edge Function to create user
    // This is necessary because creating auth users requires service role key
    // which should not be exposed in the client
    const { data: result, error: functionError } = await supabase.functions.invoke(
      'create-user',
      {
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
          role: data.role,
          club_id: data.club_id,
        },
      }
    )

    if (functionError) {
      return {
        success: false,
        error: functionError.message || 'Failed to create user',
      }
    }

    if (!result || !result.success) {
      return {
        success: false,
        error: result?.error || 'Failed to create user',
      }
    }

    return { success: true, userId: result.userId }
  } catch (error) {
    console.error('Error creating user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
