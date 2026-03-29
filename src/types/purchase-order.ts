import type { Database } from '@/lib/database.types'

// ============================================
// Database Types
// ============================================

export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
export type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert']
export type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update']

export type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row']
export type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert']
export type PurchaseOrderItemUpdate = Database['public']['Tables']['purchase_order_items']['Update']

// ============================================
// Status Types
// ============================================

export type PurchaseOrderStatus =
  | 'pending'
  | 'approved'
  | 'in_production'
  | 'shipped'
  | 'delivered'

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  in_production: 'En Producción',
  shipped: 'Enviado',
  delivered: 'Entregado',
} as const

// ============================================
// Extended Types with Relations
// ============================================

export interface PurchaseOrderItemWithDetails extends PurchaseOrderItem {
  inventory_items?: {
    id: string
    variant_id: string
    stock: number
    product_variants?: {
      id: string
      color: string
      products?: {
        name: string
      }
      sizes?: {
        name: string
      }
    }
  }
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  purchase_order_items?: PurchaseOrderItemWithDetails[]
}

// ============================================
// Service Input Types
// ============================================

export interface PurchaseOrderItemInput {
  inventory_item_id: string
  quantity: number
}

export interface CreatePurchaseOrderPayload {
  supplier: string
  expected_date: string
  notes?: string
  items: PurchaseOrderItemInput[]
}

export interface UpdatePurchaseOrderPayload {
  supplier?: string
  status?: PurchaseOrderStatus
  expected_date?: string
  notes?: string
  items?: PurchaseOrderItemInput[]
}

// RPC payload format (service -> Supabase RPC)
export interface CreatePurchaseOrderRPCPayload {
  p_supplier: string
  p_expected_date: string
  p_notes: string | null
  p_items: PurchaseOrderItemInput[]
}

// ============================================
// Service Response Types
// ============================================

export interface PurchaseOrdersResponse {
  success: boolean
  error?: string
  purchaseOrders?: PurchaseOrderWithItems[]
}

export interface PurchaseOrderResponse {
  success: boolean
  error?: string
  purchaseOrder?: PurchaseOrderWithItems
}

export interface CreatePurchaseOrderResponse {
  success: boolean
  error?: string
  purchaseOrderId?: string
}

export interface UpdatePurchaseOrderResponse {
  success: boolean
  error?: string
}

export interface DeletePurchaseOrderResponse {
  success: boolean
  error?: string
}
