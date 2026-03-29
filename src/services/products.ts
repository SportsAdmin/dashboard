import { supabase } from '@/lib/supabase'
import type {
  Product,
  ProductWithVariants,
  CreateProductPayload,
  ProductsResponse,
  CreateProductResponse,
} from '@/types'

// ============================================
// Service Functions
// ============================================

/**
 * Get all products with their variants
 *
 * Fetches products from Supabase and joins with product_variants
 * to get complete product information including all variants.
 *
 * @returns {Promise} Response with products array or error
 *
 * @example
 * const response = await getProducts()
 * if (response.success && response.products) {
 *   console.log('Products:', response.products)
 *   // Each product includes its variants array
 * }
 */
export async function getProducts(): Promise<ProductsResponse> {
  try {
    // Fetch products with their variants using Supabase join syntax
    // The '*' after product_variants gets all variant fields
    const { data, error } = await supabase
      .from('products')
      .select(
        `
        *,
        variants:product_variants(*)
      `
      )
      .order('created_at', { ascending: false })

    if (error) {
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

    // Transform the data to match our ProductWithVariants type
    const products: ProductWithVariants[] = data.map((product: Product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      club_id: product.club_id,
      created_at: product.created_at,
      updated_at: product.updated_at,
      variants: product.variants || [],
    }))

    return {
      success: true,
      products,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Create a new product with its variants using RPC
 *
 * Calls the backend RPC function "create_product" which handles:
 * - Automatic club_id assignment based on authenticated user
 * - Product creation
 * - Variant creation
 * - Inventory item creation (via trigger)
 *
 * @param {CreateProductPayload} payload - Product and variants data
 * @returns {Promise} Response with created product ID or error
 *
 * @example
 * const response = await createProduct({
 *   product: {
 *     name: 'Team Jersey',
 *     category: 'Apparel',
 *     description: 'Official team jersey'
 *   },
 *   variants: [
 *     { size_id: 'uuid-1', color: 'Blue', price: 49.99, price_sale: 39.99 },
 *     { size_id: 'uuid-2', color: 'Blue', price: 49.99 },
 *     { size_id: 'uuid-3', color: 'Red', price: 54.99 }
 *   ]
 * })
 *
 * if (response.success && response.productId) {
 *   console.log('Product created:', response.productId)
 * }
 */
export async function createProduct(
  payload: CreateProductPayload
): Promise<CreateProductResponse> {
  try {
    // Transform variants to match RPC function parameter shape
    const transformedVariants = payload.variants.map((variant) => ({
      size_id: variant.size_id,
      color: variant.color,
      price: variant.price,
      price_sale: variant.price_sale ?? null,
    }))

    // Call RPC function to create product
    // Backend handles: club_id assignment, product creation, variant creation, inventory creation
    const { data, error } = await supabase.rpc('create_product', {
      p_name: payload.product.name,
      p_category: payload.product.category,
      p_description: payload.product.description,
      p_variants: transformedVariants,
    })

    if (error) {
      console.error('RPC create_product error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data) {
      return {
        success: false,
        error: 'Failed to create product - no product ID returned',
      }
    }

    return {
      success: true,
      productId: data,
    }
  } catch (error) {
    console.error('Unexpected error in createProduct:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
