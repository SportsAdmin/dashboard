import { z } from 'zod'

export const inventoryItemSchema = z.object({
  id: z.string(),
  productName: z.string(),
  category: z.string(),
  size: z.string(),
  color: z.string(),
  stock: z.number(),
  price: z.number(),
  variantId: z.string(),
  clubId: z.string().nullable().optional(),
})

export type InventoryItem = z.infer<typeof inventoryItemSchema>
