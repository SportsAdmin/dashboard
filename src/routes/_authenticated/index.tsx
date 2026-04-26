import { createFileRoute } from '@tanstack/react-router'
import { PosDashboard } from '@/features/pos/dashboard'
import { PosSales } from '@/features/pos/sales'
import { useRole } from '@/hooks/use-role'

function RootDashboard() {
  const { role, loading } = useRole()

  if (loading) {
    return null // or a loading spinner if you prefer
  }

  // Managers see the POS dashboard at the root
  if (role === 'manager' || role === 'admin') {
    return <PosDashboard />
  }

  // Other roles see the default dashboard
  return <PosSales />
}

export const Route = createFileRoute('/_authenticated/')({
  component: RootDashboard,
})
