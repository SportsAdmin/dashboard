import { supabase } from '@/lib/supabase'

export type ReturnCondition = 'new' | 'used' | 'damaged'

interface VariantInfo {
  color: string | null
  products: { name: string } | null
  sizes: { name: string } | null
}

export interface ReturnRecord {
  id: string
  created_at: string
  reason: string | null
  sale_id: string
  creator: { name: string } | null
  sales: { id: string; created_at: string; total: number } | null
  return_items: {
    id: string
    quantity: number
    condition: ReturnCondition
    restocked: boolean
    product_variants: VariantInfo | null
  }[]
}

export interface ReturnableSaleItem {
  variant_id: string
  label: string
  price: number
  sold: number
  returned: number
  /** Units that can still be returned */
  available: number
}

export interface ReturnableSale {
  id: string
  created_at: string
  total: number
  items: ReturnableSaleItem[]
}

export interface ReturnItemInput {
  variant_id: string
  quantity: number
  condition?: ReturnCondition
}

export function variantLabel(variant: VariantInfo | null | undefined): string {
  if (!variant) return '—'
  return [variant.products?.name, variant.sizes?.name, variant.color]
    .filter(Boolean)
    .join(' ')
}

/** Short, human-friendly reference for a sale id */
export function saleRef(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`
}

const VARIANT_SELECT = 'color, products(name), sizes(name)'

/** Returns visible to the current user (RLS: own club, or all for admin). */
export async function getReturns(): Promise<ReturnRecord[]> {
  const { data, error } = await supabase
    .from('returns' as never)
    .select(
      `id, created_at, reason, sale_id,
       creator:profiles!returns_created_by_fkey(name),
       sales(id, created_at, total),
       return_items(id, quantity, condition, restocked, product_variants(${VARIANT_SELECT}))`
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ReturnRecord[]
}

interface RawSale {
  id: string
  created_at: string
  total: number
  sale_items: {
    variant_id: string
    quantity: number
    price: number
    product_variants: VariantInfo | null
  }[]
  returns: { return_items: { variant_id: string; quantity: number }[] }[]
}

/**
 * Recent sales with, per product, how many units can still be returned.
 * Sales with nothing left to return are omitted.
 */
export async function getReturnableSales(limit = 50): Promise<ReturnableSale[]> {
  const { data, error } = await supabase
    .from('sales' as never)
    .select(
      `id, created_at, total,
       sale_items(variant_id, quantity, price, product_variants(${VARIANT_SELECT})),
       returns(return_items(variant_id, quantity))`
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as RawSale[])
    .map((sale) => {
      const returned = new Map<string, number>()
      for (const ret of sale.returns ?? []) {
        for (const ri of ret.return_items ?? []) {
          returned.set(ri.variant_id, (returned.get(ri.variant_id) ?? 0) + ri.quantity)
        }
      }

      const byVariant = new Map<string, ReturnableSaleItem>()
      for (const si of sale.sale_items ?? []) {
        const current = byVariant.get(si.variant_id)
        if (current) {
          current.sold += si.quantity
        } else {
          byVariant.set(si.variant_id, {
            variant_id: si.variant_id,
            label: variantLabel(si.product_variants),
            price: Number(si.price),
            sold: si.quantity,
            returned: 0,
            available: 0,
          })
        }
      }

      const items = [...byVariant.values()].map((item) => {
        const done = returned.get(item.variant_id) ?? 0
        return { ...item, returned: done, available: Math.max(0, item.sold - done) }
      })

      return { id: sale.id, created_at: sale.created_at, total: Number(sale.total), items }
    })
    .filter((sale) => sale.items.some((item) => item.available > 0))
}

/** Registers a return; 'damaged' items are not put back into stock. */
export async function createReturn(
  saleId: string,
  items: ReturnItemInput[],
  reason?: string
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_return' as never,
    { p_sale_id: saleId, p_items: items, p_reason: reason || null } as never
  )

  if (error) throw new Error(error.message)
  return data as unknown as string
}

/**
 * Cancels a return (admin / manager only — enforced by the database).
 * Units that had been put back into stock are taken out again.
 */
export async function deleteReturn(returnId: string): Promise<void> {
  const { error } = await supabase.rpc(
    'delete_return' as never,
    { p_return_id: returnId } as never
  )

  if (error) throw new Error(error.message)
}
