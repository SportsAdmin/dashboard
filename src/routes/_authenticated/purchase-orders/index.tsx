import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PurchaseOrders } from '@/features/purchase-orders'

const purchaseOrdersSearchSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  search: z.string().optional(),
  status: z.array(z.string()).optional(),
})

export const Route = createFileRoute('/_authenticated/purchase-orders/')({
  component: PurchaseOrders,
  validateSearch: purchaseOrdersSearchSchema,
})
