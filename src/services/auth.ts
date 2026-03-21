import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// ============================================
// Types
// ============================================

export interface AuthUser {
  id: string
  email: string
  role?: string[]
}

export interface AuthResponse {
  success: boolean
  error?: string
}

export interface LoginResponse extends AuthResponse {
  user?: AuthUser
}

export interface UserResponse extends AuthResponse {
  user: User | null
}

export interface SessionResponse extends AuthResponse {
  session: Session | null
}

// ============================================
// Helper Functions
// ============================================

/**
 * Handle errors consistently across all auth functions
 */
function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

/**
 * Transform Supabase user to AuthUser
 */
function transformUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    role: user.user_metadata?.role || ['user'],
  }
}

// ============================================
// Auth Functions
// ============================================

/**
 * Login with email and password using Supabase authentication
 *
 * @param email - User email address
 * @param password - User password
 * @returns LoginResponse with user data on success
 *
 * @example
 * const response = await login('user@example.com', 'password123')
 * if (response.success) {
 *   console.log('Logged in:', response.user)
 * } else {
 *   console.error('Login failed:', response.error)
 * }
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No user returned from authentication',
      }
    }

    return {
      success: true,
      user: transformUser(data.user),
    }
  } catch (error) {
    return {
      success: false,
      error: handleError(error),
    }
  }
}

/**
 * Logout the current user
 *
 * @returns AuthResponse indicating success or failure
 *
 * @example
 * const response = await logout()
 * if (response.success) {
 *   console.log('Logged out successfully')
 * }
 */
export async function logout(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: handleError(error),
    }
  }
}

/**
 * Get the current authenticated user
 *
 * @returns UserResponse with user data or null
 *
 * @example
 * const response = await getCurrentUser()
 * if (response.success && response.user) {
 *   console.log('Current user:', response.user)
 * }
 */
export async function getCurrentUser(): Promise<UserResponse> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return {
        success: false,
        error: error.message,
        user: null,
      }
    }

    return {
      success: true,
      user,
    }
  } catch (error) {
    return {
      success: false,
      error: handleError(error),
      user: null,
    }
  }
}

/**
 * Get the current session
 *
 * @returns SessionResponse with session data or null
 *
 * @example
 * const response = await getSession()
 * if (response.success && response.session) {
 *   console.log('Active session:', response.session)
 * }
 */
export async function getSession(): Promise<SessionResponse> {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return {
        success: false,
        error: error.message,
        session: null,
      }
    }

    return {
      success: true,
      session: data.session,
    }
  } catch (error) {
    return {
      success: false,
      error: handleError(error),
      session: null,
    }
  }
}

/**
 * Check if user is authenticated
 *
 * @returns boolean indicating if user is authenticated
 *
 * @example
 * const isAuth = await isAuthenticated()
 * if (isAuth) {
 *   console.log('User is logged in')
 * }
 */
export async function isAuthenticated(): Promise<boolean> {
  const { session } = await getSession()
  return session !== null
}
