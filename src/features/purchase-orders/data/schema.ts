import { z } from 'zod'

export const purchaseOrderSchema = z.object({
  id: z.string(),
  supplier: z.string(),
  status: z.enum([
    'pending',
    'approved',
    'in_production',
    'shipped',
    'delivered',
  ]),
  expected_date: z.string(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      inventory_item_id: z.string(),
      quantity: z.number(),
      product_name: z.string().optional(),
      size: z.string().optional(),
      color: z.string().optional(),
    })
  ),
})

export type PurchaseOrderRow = z.infer<typeof purchaseOrderSchema>
