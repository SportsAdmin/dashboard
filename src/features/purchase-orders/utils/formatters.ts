import type { PurchaseOrderWithItems, PurchaseOrderItemWithDetails } from '@/types'

/**
 * Calculate total quantity of items in a purchase order
 */
export function getTotalQuantity(purchaseOrder: PurchaseOrderWithItems): number {
  return (
    purchaseOrder.purchase_order_items?.reduce(
      (sum: number, item: PurchaseOrderItemWithDetails) => sum + item.quantity,
      0
    ) || 0
  )
}

/**
 * Get formatted product name from purchase order item
 * Format: "Product Size Color"
 * Example: "Camiseta M Negra"
 */
export function getProductLabel(item: PurchaseOrderItemWithDetails): string {
  const variant = item.inventory_items?.product_variants
  const productName = variant?.products?.name || 'Unknown Product'
  const size = variant?.sizes?.name || ''
  const color = variant?.color || ''

  return `${productName} ${size} ${color}`.trim()
}

/**
 * Get product preview list (first N products)
 */
export function getProductPreviews(
  purchaseOrder: PurchaseOrderWithItems,
  limit: number = 2
): { previews: string[]; hasMore: boolean; remaining: number } {
  const items = purchaseOrder.purchase_order_items || []
  const previews = items.slice(0, limit).map(getProductLabel)
  const hasMore = items.length > limit
  const remaining = items.length - limit

  return {
    previews,
    hasMore,
    remaining,
  }
}

/**
 * Check if purchase order is overdue
 */
export function isOverdue(purchaseOrder: PurchaseOrderWithItems): boolean {
  if (purchaseOrder.status === 'delivered') return false

  try {
    const expectedDate = new Date(purchaseOrder.expected_date)
    return expectedDate < new Date()
  } catch {
    return false
  }
}

/**
 * Get status badge variant
 */
export function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
    pending: 'outline',
    approved: 'secondary',
    in_production: 'default',
    shipped: 'secondary',
    delivered: 'success',
  }

  return variants[status] || 'default'
}

/**
 * Get status display label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    in_production: 'In Production',
    shipped: 'Shipped',
    delivered: 'Delivered',
  }

  return labels[status] || status
}
