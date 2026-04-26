import type { Database } from '@/lib/database.types'

// ============================================
// Database Types
// ============================================

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type ProductVariant = Database['public']['Tables']['product_variants']['Row']
export type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert']
export type ProductVariantUpdate = Database['public']['Tables']['product_variants']['Update']

export type Size = Database['public']['Tables']['sizes']['Row']
export type SizeInsert = Database['public']['Tables']['sizes']['Insert']
export type SizeUpdate = Database['public']['Tables']['sizes']['Update']

// ============================================
// Extended Types with Relations
// ============================================

// Type for Supabase query response that includes variants
export interface ProductFromSupabase extends Product {
  variants: ProductVariant[]
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
}

export interface ProductVariantWithDetails extends ProductVariant {
  product?: Product
  size?: Size
}

// ============================================
// Service Input Types
// ============================================

export interface ProductVariantInput {
  size_id: string
  color: string
  price: number
  price_sale?: number | null
}

export interface CreateProductPayload {
  product: {
    name: string
    category: string
    description: string
  }
  variants: ProductVariantInput[]
}

export interface CreateProductRPCParams {
  p_name: string
  p_category: string
  p_description: string
  p_variants: {
    size_id: string
    color: string
    price: number
    price_sale: number | null
  }[]
}

export interface UpdateProductPayload {
  name?: string
  category?: string
  description?: string
}

// ============================================
// Service Response Types
// ============================================

export interface ProductsResponse {
  success: boolean
  error?: string
  products?: ProductWithVariants[]
}

export interface ProductResponse {
  success: boolean
  error?: string
  product?: ProductWithVariants
}

export interface CreateProductResponse {
  success: boolean
  error?: string
  productId?: string
}

export interface UpdateProductResponse {
  success: boolean
  error?: string
}

export interface DeleteProductResponse {
  success: boolean
  error?: string
}

export interface SizesResponse {
  success: boolean
  error?: string
  sizes?: Size[]
}
