import { createFileRoute } from '@tanstack/react-router'
import { CreatePurchaseOrder } from '@/features/purchase-orders/create'

export const Route = createFileRoute('/_authenticated/purchase-orders/create')({
  component: CreatePurchaseOrder,
})
