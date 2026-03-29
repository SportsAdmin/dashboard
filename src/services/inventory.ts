import { supabase } from '@/lib/supabase'
import type { InventoryItem } from '@/types'

// ============================================
// Service Functions
// ============================================

/**
 * Get all inventory items with joined product data
 *
 * Fetches inventory items from Supabase and joins with:
 * - product_variants (for color, price, variant info)
 * - products (for product name and category)
 * - sizes (for size name)
 *
 * @returns {Promise} Response with inventory items or error
 *
 * @example
 * const response = await getInventory()
 * if (response.success && response.inventory) {
 *   console.log('Inventory items:', response.inventory)
 * }
 */
export async function getInventory(): Promise<{
  success: boolean
  error?: string
  inventory?: InventoryItem[]
}> {
  try {
    // Fetch inventory with all related data using Supabase joins
    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        `
        id,
        stock,
        variant_id,
        product_variants (
          id,
          color,
          price,
          products (
            name,
            category
          ),
          sizes (
            name
          )
        )
      `
      )
      .order('stock', { ascending: true }) // Show low stock items first

    if (error) {
      console.error('Error fetching inventory:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data) {
      return {
        success: true,
        inventory: [],
      }
    }

    // Transform the nested data structure to a flat format for easier use in UI
    const formattedInventory: InventoryItem[] = data
      .filter((item) => item.product_variants) // Filter out items with missing variant data
      .map((item: InventoryItem) => {
        const variant = item.product_variants as any
        const product = variant?.products
        const size = variant?.sizes

        return {
          id: item.id,
          productName: product?.name || 'Unknown Product',
          category: product?.category || 'Unknown Category',
          size: size?.name || 'Unknown Size',
          color: variant?.color || 'Unknown Color',
          price: variant?.price || 0,
          stock: item.stock,
          variantId: item.variant_id,
        }
      })

    return {
      success: true,
      inventory: formattedInventory,
    }
  } catch (error) {
    console.error('Unexpected error in getInventory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
