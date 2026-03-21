import { supabase } from '@/lib/supabase'

// ============================================
// Types
// ============================================

export interface Club {
  name: string
  city: string
  logo_url?: string | null
}

export interface Admin {
  name: string
  email: string
  password: string
}

export interface CreateClubPayload {
  club: Club
  admin: Admin
}

export interface CreateClubResponse {
  success: boolean
  error?: string
  clubId?: string
  userId?: string
}

// ============================================
// Service Functions
// ============================================

/**
 * Create a new club with its admin user
 *
 * ⚠️ SECURITY IMPORTANT ⚠️
 *
 * This function calls a Supabase Edge Function to create users securely.
 *
 * WHY EDGE FUNCTION?
 * - Creating users requires Supabase ADMIN API (service role key)
 * - NEVER expose service role keys in frontend code
 * - Edge Functions run server-side with proper credentials
 * - Prevents unauthorized user creation
 *
 * PROCESS:
 * 1. Frontend calls this service function
 * 2. Service calls Edge Function (server-side)
 * 3. Edge Function uses Admin API to:
 *    - Create auth user
 *    - Create club record
 *    - Create admin profile
 * 4. Returns result to frontend
 *
 * @param payload - Club and admin information
 * @returns CreateClubResponse with success status and IDs
 *
 * @example
 * const response = await createClubWithAdmin({
 *   club: {
 *     name: 'FC Barcelona',
 *     city: 'Barcelona',
 *     logo_url: 'https://...'
 *   },
 *   admin: {
 *     name: 'John Doe',
 *     email: 'admin@fcbarcelona.com',
 *     password: 'SecurePass123'
 *   }
 * })
 *
 * if (response.success) {
 *   console.log('Club created:', response.clubId)
 *   console.log('Admin user created:', response.userId)
 * }
 */
export async function createClubWithAdmin(
  payload: CreateClubPayload
): Promise<CreateClubResponse> {
  try {
    // Get Supabase project URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

    if (!supabaseUrl) {
      return {
        success: false,
        error: 'Supabase URL not configured',
      }
    }

    // Get current session token for authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return {
        success: false,
        error: 'You must be logged in to create a club',
      }
    }

    // Call Supabase Edge Function
    // The Edge Function has access to service role key (server-side)
    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-club`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Send user's JWT for authorization check
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          club: {
            name: payload.club.name,
            city: payload.club.city,
            logo_url: payload.club.logo_url || null,
          },
          admin: {
            name: payload.admin.name,
            email: payload.admin.email,
            password: payload.admin.password,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()

    return {
      success: true,
      clubId: data.clubId,
      userId: data.userId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get all clubs
 *
 * @returns List of clubs
 *
 * @example
 * const response = await getClubs()
 * if (response.success && response.clubs) {
 *   console.log('Clubs:', response.clubs)
 * }
 */
export async function getClubs(): Promise<{
  success: boolean
  error?: string
  clubs?: Array<{
    id: string
    name: string
    city: string
    logo_url: string | null
    created_at: string
  }>
}> {
  try {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      clubs: data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
