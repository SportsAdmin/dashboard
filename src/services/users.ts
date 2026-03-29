import { supabase } from '@/lib/supabase'
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
 * Get current user's profile with role and club information
 * Used for role-based access control
 */
async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Not authenticated')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, club_id')
    .eq('id', user.id)
    .single<Profile>()

  if (profileError) {
    throw new Error(`Failed to fetch profile: ${profileError.message}`)
  }

  if (!profile) {
    throw new Error('Profile not found')
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
  // Get current user's profile to determine access level
  const currentProfile = await getCurrentUserProfile()

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

  // Fetch emails from auth.users
  // Note: This requires service role key or admin API access
  // If not available, we'll return users without email
  let emailMap: Record<string, string> = {}

  try {
    // Get all user IDs
    // const userIds = profiles.map((p) => p.id)

    // Fetch emails for these users
    // This approach works if you have RLS policies that allow reading auth data
    // Alternative: Use a server-side function or edge function
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (!authError && authUsers?.users) {
      // Create a map of user_id -> email
      emailMap = authUsers.users.reduce(
        (acc, user) => {
          if (user.email) {
            acc[user.id] = user.email
          }
          return acc
        },
        {} as Record<string, string>
      )
    }
  } catch (error) {
    // If we can't fetch emails (due to permissions), continue without them
    console.warn('Unable to fetch user emails:', error)
  }

  // Combine profile data with emails
  const users: User[] = (profiles as Profile[]).map((profile) => ({
    id: profile.id,
    name: profile.name,
    email: emailMap[profile.id] || null,
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
export async function checkUserAccess(): Promise<{
  hasAccess: boolean
  role: UserRole | null
}> {
  try {
    const profile = await getCurrentUserProfile()

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
