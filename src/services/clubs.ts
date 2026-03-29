import { supabase } from '@/lib/supabase'
import type {
  Profile,
  CreateClubPayload,
  CreateClubResponse,
  ClubsResponse,
} from '@/types'

// ============================================
// Service Functions
// ============================================

/**
 * Debug Edge Function - Test connectivity and environment
 * This is a diagnostic function to troubleshoot Edge Function issues
 */
export async function debugEdgeFunction(): Promise<any> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const functionUrl = `${supabaseUrl}/functions/v1/create-club`

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': sessionData?.session?.access_token
          ? `Bearer ${sessionData.session.access_token}`
          : 'Bearer none',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ debug: true }),
    })

    const data = await response.json()
    console.log('🔍 Edge Function Debug Response:', data)
    return data
  } catch (error) {
    console.error('❌ Debug request failed:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Check current user's profile and role
 * Useful for debugging authentication issues
 */
export async function checkCurrentUserProfile(): Promise<{
  success: boolean
  error?: string
  profile?: {
    id: string
    role: string
    name: string
    email: string
  }
}> {
  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !sessionData?.session) {
      return {
        success: false,
        error: 'Not logged in',
      }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, name')
      .eq('id', sessionData.session.user.id)
      .single<Profile>()

    if (profileError || !profile) {
      return {
        success: false,
        error: `Profile not found: ${profileError?.message || 'Unknown error'}`,
      }
    }

    return {
      success: true,
      profile: {
        id: profile.id,
        role: profile.role,
        name: profile.name,
        email: sessionData.session.user.email || '',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

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
    console.log('📤 Calling create-club Edge Function with payload:', {
      club_name: payload.club.name,
      email: payload.admin.email,
      name: payload.admin.name,
      // Don't log password for security
    })

    // Verify user is authenticated and get valid session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !sessionData?.session) {
      console.error('❌ No valid session found:', sessionError)
      return {
        success: false,
        error: 'You must be logged in to create a club. Please sign in and try again.',
      }
    }

    console.log('✅ Valid session found for user:', sessionData.session.user.email)
    console.log('📝 Access token (first 20 chars):', sessionData.session.access_token.substring(0, 20) + '...')

    // Check user profile and role before calling Edge Function
    const profileCheck = await checkCurrentUserProfile()
    console.log('👤 Profile check result:', profileCheck)

    if (!profileCheck.success || !profileCheck.profile) {
      return {
        success: false,
        error: `Profile verification failed: ${profileCheck.error || 'Unknown error'}`,
      }
    }

    if (profileCheck.profile.role !== 'admin') {
      return {
        success: false,
        error: `Insufficient permissions. Your role is '${profileCheck.profile.role}', but 'admin' role is required to create clubs.`,
      }
    }

    console.log('✅ User has admin role, proceeding with club creation')

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const functionUrl = `${supabaseUrl}/functions/v1/create-club`

    console.log('🔗 Calling Edge Function at:', functionUrl)

    // Call Edge Function using fetch for better error handling
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        club_name: payload.club.name,
        email: payload.admin.email,
        password: payload.admin.password,
        name: payload.admin.name,
      }),
    })

    console.log('📥 Edge Function HTTP response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    // Parse response
    let data: any = null
    let error: any = null

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Edge Function error response:', errorData)
      error = {
        message: errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        context: errorData,
      }
    } else {
      data = await response.json()
      console.log('✅ Edge Function success response:', data)
    }

    console.log('📥 Edge Function final result:', { data, error })

    if (error) {
      console.error('❌ Error calling create-club function:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        context: error.context,
      })

      // Try to parse error details from the response
      let errorMessage = error.message || 'Failed to create club'

      // Check if error.context contains response details
      if (error.context) {
        console.error('❌ Error context:', error.context)
      }

      if (error.message?.includes('Failed to send a request')) {
        errorMessage = 'Cannot connect to Edge Function. Please check:\n' +
          '1. Edge Function is deployed and running\n' +
          '2. Function name is "create-club"\n' +
          '3. CORS is properly configured\n' +
          '4. Network connection is stable'
      } else if (error.message?.includes('non-2xx')) {
        // Extract more details about the non-2xx response
        errorMessage = `Server error: ${error.message}. Check browser console for details.`
      }

      return {
        success: false,
        error: errorMessage,
      }
    }

    // Check if the response indicates success
    if (!data || data.error) {
      console.error('❌ Edge Function returned error:', data)

      // Provide detailed error message from server
      let errorDetails = data?.error || 'Failed to create club'
      if (data?.details) {
        errorDetails += `\n${data.details}`
      }

      return {
        success: false,
        error: errorDetails,
      }
    }

    console.log('✅ Club created successfully:', {
      clubId: data.clubId || data.club_id,
      userId: data.userId || data.user_id,
    })

    return {
      success: true,
      clubId: data.clubId || data.club_id,
      userId: data.userId || data.user_id,
    }
  } catch (error) {
    console.error('💥 Unexpected error in createClubWithAdmin:', error)
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
export async function getClubs(): Promise<ClubsResponse> {
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
