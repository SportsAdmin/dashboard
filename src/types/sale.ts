import type { Database } from '@/lib/database.types'

// ============================================
// Database Types
// ============================================

export type Sale = Database['public']['Tables']['sales']['Row']
export type SaleInsert = Database['public']['Tables']['sales']['Insert']
export type SaleUpdate = Database['public']['Tables']['sales']['Update']

export type SaleItem = Database['public']['Tables']['sale_items']['Row']
export type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert']
export type SaleItemUpdate = Database['public']['Tables']['sale_items']['Update']

// ============================================
// Payment Methods
// ============================================

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
} as const

// ============================================
// POS/Cart Types
// ============================================

export interface CartItem {
  id: string // inventory_item_id
  variant_id: string // product_variant_id (for sales table)
  productName: string
  size: string
  color: string
  price: number
  quantity: number
  stock: number
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
}

// ============================================
// Extended Types with Relations
// ============================================

export interface SaleItemWithDetails extends SaleItem {
  product_variant?: {
    id: string
    color: string
    price: number
    product?: {
      name: string
      category: string
    }
    size?: {
      name: string
    }
  }
}

export interface SaleWithItems extends Sale {
  sale_items?: SaleItemWithDetails[]
}

// ============================================
// Service Input Types
// ============================================

export interface SaleItemInput {
  variant_id: string
  quantity: number
  price: number
}

export interface CreateSalePayload {
  customer_name?: string | null
  total: number
  tax: number
  payment_method: PaymentMethod
  items: SaleItemInput[]
}

// ============================================
// Service Response Types
// ============================================

export interface SalesResponse {
  success: boolean
  error?: string
  sales?: SaleWithItems[]
}

export interface SaleResponse {
  success: boolean
  error?: string
  sale?: SaleWithItems
}

export interface CreateSaleResponse {
  success: boolean
  error?: string
  saleId?: string
}
