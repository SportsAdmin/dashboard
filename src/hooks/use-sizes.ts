import { useEffect, useState } from 'react'
import { getSizes, type Size } from '@/services/sizes'

interface UseSizesReturn {
  sizes: Size[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching and managing sizes data
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Refetch functionality
 *
 * @returns {UseSizesReturn} Sizes data, loading state, error, and refetch function
 *
 * @example
 * function SizeSelector() {
 *   const { sizes, loading, error, refetch } = useSizes()
 *
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *
 *   return (
 *     <select>
 *       {sizes.map(size => (
 *         <option key={size.id} value={size.id}>{size.name}</option>
 *       ))}
 *     </select>
 *   )
 * }
 */
export function useSizes(): UseSizesReturn {
  const [sizes, setSizes] = useState<Size[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSizes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getSizes()

      if (response.success && response.sizes) {
        setSizes(response.sizes)
      } else {
        setError(response.error || 'Failed to fetch sizes')
        setSizes([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setSizes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSizes()
  }, [])

  return {
    sizes,
    loading,
    error,
    refetch: fetchSizes,
  }
}
