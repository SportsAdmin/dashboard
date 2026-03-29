import { createFileRoute } from '@tanstack/react-router'
import { EditPurchaseOrder } from '@/features/purchase-orders/edit'

export const Route = createFileRoute('/_authenticated/purchase-orders/$id')({
  component: EditPurchaseOrder,
})
