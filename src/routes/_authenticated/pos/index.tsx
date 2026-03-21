import { createFileRoute } from '@tanstack/react-router'
import { PosDashboard } from '@/features/pos/dashboard'

export const Route = createFileRoute('/_authenticated/pos/')({
  component: PosDashboard,
})
