import { supabase } from '@/lib/supabase'

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mercadopago'

export interface CreateSaleInput {
  /** Price is NOT sent: the database uses the variant's current price. */
  items: { variant_id: string; quantity: number }[]
  payments: { method: PaymentMethod; amount: number }[]
  customerId?: string | null
  /** Only needed for admins (staff always sell for their own club). */
  clubId?: string | null
}

/**
 * Registers a sale atomically through the `create_sale` RPC:
 * validates stock, discounts it, records stock movements and payments.
 * Throws with the database message (e.g. "Stock insuficiente ...") on failure.
 */
export async function createSale(input: CreateSaleInput): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_sale' as never,
    {
      p_items: input.items,
      p_payments: input.payments,
      p_customer_id: input.customerId ?? null,
      p_club_id: input.clubId ?? null,
    } as never
  )

  if (error) throw new Error(error.message)
  return data as unknown as string
}

export interface ReturnItemInput {
  variant_id: string
  quantity: number
  condition?: 'new' | 'used' | 'damaged'
}

/** Registers a return; 'damaged' items are not put back into stock. */
export async function createReturn(
  saleId: string,
  items: ReturnItemInput[],
  reason?: string
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_return' as never,
    { p_sale_id: saleId, p_items: items, p_reason: reason ?? null } as never
  )

  if (error) throw new Error(error.message)
  return data as unknown as string
}

/** Manual stock correction (admin / manager). Returns the new stock. */
export async function adjustStock(
  inventoryItemId: string,
  delta: number,
  reason?: string
): Promise<number> {
  const { data, error } = await supabase.rpc(
    'adjust_stock' as never,
    {
      p_inventory_item_id: inventoryItemId,
      p_delta: delta,
      p_reason: reason ?? null,
    } as never
  )

  if (error) throw new Error(error.message)
  return data as unknown as number
}
