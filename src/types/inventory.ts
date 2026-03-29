import type { Database } from '@/lib/database.types'
import type { Product, Size } from './product'

// ============================================
// Database Types
// ============================================

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row']
export type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert']
export type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update']

// ============================================
// Extended Types with Relations
// ============================================

export interface InventoryItemWithDetails extends InventoryItem {
  product_variant?: {
    id: string
    color: string
    price: number
    price_sale: number | null
    product?: Product
    size?: Size
  }
}

// ============================================
// Service Input Types
// ============================================

export interface UpdateInventoryPayload {
  variant_id: string
  stock: number
}

export interface AdjustInventoryPayload {
  variant_id: string
  adjustment: number // positive for adding, negative for removing
  reason?: string
}

// ============================================
// Service Response Types
// ============================================

export interface InventoryItemsResponse {
  success: boolean
  error?: string
  inventoryItems?: InventoryItemWithDetails[]
}

export interface InventoryItemResponse {
  success: boolean
  error?: string
  inventoryItem?: InventoryItemWithDetails
}

export interface UpdateInventoryResponse {
  success: boolean
  error?: string
}
