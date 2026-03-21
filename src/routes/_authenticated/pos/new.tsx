import { createFileRoute } from '@tanstack/react-router'
import { PosSales } from '@/features/pos/sales'

export const Route = createFileRoute('/_authenticated/pos/new')({
  component: PosSales,
})
