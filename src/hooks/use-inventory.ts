import { useEffect, useState } from 'react'
import { getInventory } from '@/services/inventory'
import { type InventoryItem } from '@/features/inventory/data/schema'

interface UseInventoryReturn {
  inventory: InventoryItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching and managing inventory data
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Refetch functionality
 * - Returns formatted inventory items ready for display
 *
 * @returns {UseInventoryReturn} Inventory data, loading state, error, and refetch function
 *
 * @example
 * function InventoryList() {
 *   const { inventory, loading, error, refetch } = useInventory()
 *
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *
 *   return (
 *     <div>
 *       {inventory.map(item => (
 *         <div key={item.id}>{item.productName} - Stock: {item.stock}</div>
 *       ))}
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   )
 * }
 */
export function useInventory(): UseInventoryReturn {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getInventory()

      if (response.success && response.inventory) {
        setInventory(response.inventory)
      } else {
        setError(response.error || 'Failed to fetch inventory')
        setInventory([])
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  return {
    inventory,
    loading,
    error,
    refetch: fetchInventory,
  }
}
