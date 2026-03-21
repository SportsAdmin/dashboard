import { supabase } from '@/lib/supabase'

// ============================================
// Types
// ============================================

export interface Size {
  id: string
  name: string
  order_index: number
}

// ============================================
// Service Functions
// ============================================

/**
 * Get all sizes
 *
 * Fetches all available sizes from Supabase for use in product variants.
 *
 * @returns {Promise} Response with sizes array or error
 *
 * @example
 * const response = await getSizes()
 * if (response.success && response.sizes) {
 *   console.log('Available sizes:', response.sizes)
 * }
 */
export async function getSizes(): Promise<{
  success: boolean
  error?: string
  sizes?: Size[]
}> {
  try {
    const { data, error } = await supabase
      .from('sizes')
      .select('id, name, order_index')
      .order('order_index', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      sizes: data || [],
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
