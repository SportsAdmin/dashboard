import { supabase } from '@/lib/supabase'
import type { Profile, ProfileResponse } from '@/types'

/**
 * Get user profile by user ID
 *
 * @param userId - Supabase auth user ID
 * @returns ProfileResponse with profile data
 *
 * @example
 * const response = await getProfile('user-id-123')
 * if (response.success && response.profile) {
 *   console.log('User profile:', response.profile)
 * }
 */
export async function getProfile(userId: string): Promise<ProfileResponse> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data) {
      return {
        success: false,
        error: 'Profile not found',
      }
    }

    return {
      success: true,
      profile: data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Create a new user profile
 *
 * @param userId - Supabase auth user ID
 * @param name - User's name
 * @param role - User's role
 * @param clubId - Optional club ID
 * @returns ProfileResponse with created profile
 *
 * @example
 * const response = await createProfile('user-id-123', 'John Doe', 'admin', 'club-1')
 * if (response.success) {
 *   console.log('Profile created:', response.profile)
 * }
 */
export async function createProfile(
  userId: string,
  name: string,
  role: string,
  clubId?: string | null
): Promise<ProfileResponse> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        name,
        role,
        club_id: clubId || null,
      } as any)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      profile: data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Update user profile
 *
 * @param userId - Supabase auth user ID
 * @param updates - Profile fields to update
 * @returns ProfileResponse with updated profile
 *
 * @example
 * const response = await updateProfile('user-id-123', { name: 'Jane Doe' })
 * if (response.success) {
 *   console.log('Profile updated:', response.profile)
 * }
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'name' | 'role' | 'club_id'>>
): Promise<ProfileResponse> {
  try {
    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      // @ts-expect-error - Supabase types are not correctly generated for this table
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      profile: data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
