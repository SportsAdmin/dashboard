import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Inventory } from '@/features/inventory'

const inventorySearchSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  search: z.string().optional(),
  product: z.array(z.string()).optional(),
  stockStatus: z.array(z.string()).optional(),
})

export const Route = createFileRoute('/_authenticated/inventory')({
  component: Inventory,
  validateSearch: inventorySearchSchema,
})
