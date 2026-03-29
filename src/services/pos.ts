import { supabase } from '@/lib/supabase'

// ============================================
// Types
// ============================================

export interface POSProduct {
  id: string // inventory_item_id
  variant_id: string
  product_id: string
  product_name: string
  category: string
  size: string
  size_order: number
  color: string
  price: number
  stock: number
  label: string // "Camiseta M Negra"
}

interface InventoryItemRaw {
  id: string
  stock: number
  product_variants: {
    id: string
    price: number
    color: string
    products: {
      id: string
      name: string
      category: string
      active: boolean
    }
    sizes: {
      name: string
      order_index: number
    }
  } | null
}

// ============================================
// Service Functions
// ============================================

/**
 * Get available products for POS
 *
 * Fetches inventory items that:
 * - Have stock > 0
 * - Belong to active products
 * - Are from the user's club (handled by RLS)
 *
 * @returns {Promise} Response with available products or error
 */
export async function getAvailableProducts(): Promise<{
  success: boolean
  error?: string
  products?: POSProduct[]
}> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        `
        id,
        stock,
        product_variants (
          id,
          price,
          color,
          products (
            id,
            name,
            category,
            active
          ),
          sizes (
            name,
            order_index
          )
        )
      `
      )
      .gt('stock', 0)
      .order('stock', { ascending: false })

    if (error) {
      console.error('Error fetching POS products:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data) {
      return {
        success: true,
        products: [],
      }
    }

    // Filter and transform data
    const products: POSProduct[] = (data as InventoryItemRaw[])
      .filter((item) => {
        // Remove items without variant data or inactive products
        if (!item.product_variants) return false
        if (!item.product_variants.products) return false
        if (!item.product_variants.products.active) return false
        return true
      })
      .map((item) => {
        const variant = item.product_variants!
        const product = variant.products
        const size = variant.sizes

        const productName = product.name || 'Unknown Product'
        const sizeName = size?.name || ''
        const color = variant.color || ''

        return {
          id: item.id, // inventory_item_id
          variant_id: variant.id,
          product_id: product.id,
          product_name: productName,
          category: product.category || 'Uncategorized',
          size: sizeName,
          size_order: size?.order_index || 999,
          color: color,
          price: variant.price || 0,
          stock: item.stock,
          label: `${productName} ${sizeName} ${color}`.trim(),
        }
      })
      .sort((a, b) => {
        // Sort by product name, then size order, then color
        if (a.product_name !== b.product_name) {
          return a.product_name.localeCompare(b.product_name)
        }
        if (a.size_order !== b.size_order) {
          return a.size_order - b.size_order
        }
        return a.color.localeCompare(b.color)
      })

    return {
      success: true,
      products,
    }
  } catch (error) {
    console.error('Unexpected error in getAvailableProducts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
