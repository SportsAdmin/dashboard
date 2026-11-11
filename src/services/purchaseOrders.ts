import type {
  PurchaseOrderWithItems,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  PurchaseOrderUpdateData,
  CreatePurchaseOrderRPCPayload,
  ExistingPurchaseOrderItem,
  PurchaseOrderItemToInsert,
  PurchaseOrdersResponse,
  PurchaseOrderResponse,
  CreatePurchaseOrderResponse,
  UpdatePurchaseOrderResponse,
} from '@/types'
import { supabase } from '@/lib/supabase'

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
export async function getPurchaseOrders(): Promise<PurchaseOrdersResponse> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(
        `
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
      `
      )
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
      purchaseOrders: data as PurchaseOrderWithItems[],
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
export async function getPurchaseOrder(
  id: string
): Promise<PurchaseOrderResponse> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(
        `
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
      `
      )
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
      purchaseOrder: data as PurchaseOrderWithItems,
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
): Promise<CreatePurchaseOrderResponse> {
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
      p_club_id: payload.club_id ?? null,
    }

    // Call the RPC function
    // Supabase RPC types are not generated for create_purchase_order
    const { data, error } = await supabase.rpc(
      'create_purchase_order' as never,
      rpcPayload as never
    )

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
 * Order of operations matters:
 * 1. Items first (if they changed) — while the order is still editable.
 * 2. Then the order fields, including status. Marking it 'delivered' applies the
 *    stock in the DB (trigger) using the items saved in step 1, and locks the order.
 *
 * RLS doesn't raise when a row isn't editable for the user: it just updates 0
 * rows. We detect that and return a clear error instead of a false "success".
 */
export async function updatePurchaseOrder(
  id: string,
  payload: UpdatePurchaseOrderPayload
): Promise<UpdatePurchaseOrderResponse> {
  const notAllowed =
    'No tenés permiso para modificar esta orden (o ya fue entregada).'

  try {
    // Step 1: replace items if they actually changed
    if (payload.items && payload.items.length > 0) {
      const { data: existingItems, error: fetchError } = await supabase
        .from('purchase_order_items')
        .select('id, inventory_item_id, quantity')
        .eq('purchase_order_id', id)

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      const existing = (existingItems ?? []) as ExistingPurchaseOrderItem[]
      const itemsChanged =
        existing.length !== payload.items.length ||
        !payload.items.every((newItem) => {
          const match = existing.find(
            (e) => e.inventory_item_id === newItem.inventory_item_id
          )
          return match && match.quantity === newItem.quantity
        })

      if (itemsChanged) {
        const { data: deleted, error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', id)
          .select('id')

        if (deleteError) {
          return { success: false, error: deleteError.message }
        }
        if (existing.length > 0 && (deleted ?? []).length === 0) {
          return { success: false, error: notAllowed }
        }

        const itemsToInsert: PurchaseOrderItemToInsert[] = payload.items.map(
          (item) => ({
            purchase_order_id: id,
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
          })
        )

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          // @ts-expect-error - Supabase types are not correctly generated for purchase_order_items insert
          .insert(itemsToInsert)

        if (itemsError) {
          return { success: false, error: itemsError.message }
        }
      }
    }

    // Step 2: order fields (status last, so delivery uses the final items)
    const updateData: PurchaseOrderUpdateData = {}
    if (payload.supplier !== undefined) updateData.supplier = payload.supplier
    if (payload.status !== undefined) updateData.status = payload.status
    if (payload.expected_date !== undefined)
      updateData.expected_date = payload.expected_date
    if (payload.notes !== undefined) updateData.notes = payload.notes

    if (Object.keys(updateData).length > 0) {
      const { data: updated, error: orderError } = await supabase
        .from('purchase_orders')
        // @ts-expect-error - Supabase types are not correctly generated for this table
        .update(updateData)
        .eq('id', id)
        .select('id')

      if (orderError) {
        return { success: false, error: orderError.message }
      }
      if ((updated ?? []).length === 0) {
        return { success: false, error: notAllowed }
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
