import { supabase } from '@/lib/supabase'

// ============================================
// Types
// ============================================

export type PurchaseOrderStatus =
  | 'pending'
  | 'approved'
  | 'in_production'
  | 'shipped'
  | 'delivered'

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  inventory_item_id: string
  quantity: number
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

export interface PurchaseOrder {
  id: string
  club_id: string
  supplier: string
  status: PurchaseOrderStatus
  expected_date: string
  notes?: string | null
  created_at: string
  purchase_order_items?: PurchaseOrderItem[]
}

// Input type for purchase order items (used in creation)
export type PurchaseOrderItemInput = {
  inventory_item_id: string
  quantity: number
}

// Payload for creating a purchase order (frontend -> service)
export interface CreatePurchaseOrderPayload {
  supplier: string
  expected_date: string
  notes?: string
  items: PurchaseOrderItemInput[]
}

// Payload for updating a purchase order
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
// Service Functions
// ============================================

/**
 * Get all purchase orders with related data
 *
 * Fetches purchase orders with:
 * - Items (purchase_order_items)
 * - Product information (via inventory_items -> product_variants -> products)
 * - Size information (via sizes)
 *
 * @returns {Promise} Response with purchase orders or error
 */
export async function getPurchaseOrders(): Promise<{
  success: boolean
  error?: string
  purchaseOrders?: PurchaseOrder[]
}> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        supplier,
        status,
        expected_date,
        notes,
        created_at,
        purchase_order_items (
          id,
          quantity,
          inventory_item_id,
          inventory_items (
            id,
            variant_id,
            stock,
            product_variants (
              id,
              color,
              products (
                name
              ),
              sizes (
                name
              )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchase orders:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      purchaseOrders: data as PurchaseOrder[],
    }
  } catch (error) {
    console.error('Unexpected error in getPurchaseOrders:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get a single purchase order by ID
 *
 * @param {string} id - Purchase order ID
 * @returns {Promise} Response with purchase order or error
 */
export async function getPurchaseOrder(id: string): Promise<{
  success: boolean
  error?: string
  purchaseOrder?: PurchaseOrder
}> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        supplier,
        status,
        expected_date,
        notes,
        created_at,
        purchase_order_items (
          id,
          quantity,
          inventory_item_id,
          inventory_items (
            id,
            variant_id,
            stock,
            product_variants (
              id,
              color,
              products (
                name
              ),
              sizes (
                name
              )
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching purchase order:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      purchaseOrder: data as PurchaseOrder,
    }
  } catch (error) {
    console.error('Unexpected error in getPurchaseOrder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Create a new purchase order using RPC
 *
 * Calls the backend RPC function "create_purchase_order" which:
 * - Automatically assigns club_id based on user session
 * - Creates the purchase_order record
 * - Creates all purchase_order_items records
 * - Handles transactions and rollback
 *
 * @param {CreatePurchaseOrderPayload} payload - Purchase order data
 * @returns {Promise} Response with created purchase order ID or error
 */
export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload
): Promise<{
  success: boolean
  error?: string
  purchaseOrderId?: string
}> {
  try {
    // Transform payload for RPC call
    const rpcPayload: CreatePurchaseOrderRPCPayload = {
      p_supplier: payload.supplier,
      p_expected_date: payload.expected_date,
      p_notes: payload.notes || null,
      p_items: payload.items.map((item) => ({
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
      })),
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('create_purchase_order', rpcPayload)

    if (error) {
      console.error('Error creating purchase order via RPC:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data) {
      return {
        success: false,
        error: 'Failed to create purchase order - no ID returned',
      }
    }

    return {
      success: true,
      purchaseOrderId: data,
    }
  } catch (error) {
    console.error('Unexpected error in createPurchaseOrder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Update an existing purchase order
 *
 * @param {string} id - Purchase order ID
 * @param {UpdatePurchaseOrderPayload} payload - Updated purchase order data
 * @returns {Promise} Response with success status or error
 */
export async function updatePurchaseOrder(
  id: string,
  payload: UpdatePurchaseOrderPayload
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Update the purchase order basic fields
    const updateData: Record<string, any> = {}
    if (payload.supplier !== undefined) updateData.supplier = payload.supplier
    if (payload.status !== undefined) updateData.status = payload.status
    if (payload.expected_date !== undefined)
      updateData.expected_date = payload.expected_date
    if (payload.notes !== undefined) updateData.notes = payload.notes

    if (Object.keys(updateData).length > 0) {
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', id)

      if (orderError) {
        console.error('Error updating purchase order:', orderError)
        return {
          success: false,
          error: orderError.message,
        }
      }
    }

    // If items are provided, replace them
    if (payload.items) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id)

      if (deleteError) {
        console.error('Error deleting purchase order items:', deleteError)
        return {
          success: false,
          error: deleteError.message,
        }
      }

      // Insert new items
      if (payload.items.length > 0) {
        const itemsToInsert = payload.items.map((item) => ({
          purchase_order_id: id,
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
        }))

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('Error creating purchase order items:', itemsError)
          return {
            success: false,
            error: itemsError.message,
          }
        }
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Unexpected error in updatePurchaseOrder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Delete a purchase order
 *
 * @param {string} id - Purchase order ID
 * @returns {Promise} Response with success status or error
 */
export async function deletePurchaseOrder(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Delete items first (if not using CASCADE)
    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', id)

    if (itemsError) {
      console.error('Error deleting purchase order items:', itemsError)
      return {
        success: false,
        error: itemsError.message,
      }
    }

    // Delete the purchase order
    const { error: orderError } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id)

    if (orderError) {
      console.error('Error deleting purchase order:', orderError)
      return {
        success: false,
        error: orderError.message,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Unexpected error in deletePurchaseOrder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
