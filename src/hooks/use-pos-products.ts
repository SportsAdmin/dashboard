import { useEffect, useState } from 'react'
import { getAvailableProducts, type POSProduct } from '@/services/pos'

interface UsePOSProductsReturn {
  products: POSProduct[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  searchQuery: string
  setSearchQuery: (query: string) => void
  categoryFilter: string
  setCategoryFilter: (category: string) => void
  filteredProducts: POSProduct[]
  categories: string[]
}

/**
 * Custom hook for fetching and filtering POS products
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Search by product name
 * - Filter by category
 * - Refetch functionality
 *
 * @returns {UsePOSProductsReturn} Products data, loading state, error, and filter functions
 *
 * @example
 * function POSPage() {
 *   const { products, loading, error, searchQuery, setSearchQuery } = usePOSProducts()
 *
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *
 *   return (
 *     <div>
 *       <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
 *       {filteredProducts.map(product => (
 *         <div key={product.id}>{product.label}</div>
 *       ))}
 *     </div>
 *   )
 * }
 */
export function usePOSProducts(): UsePOSProductsReturn {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getAvailableProducts()

      if (response.success && response.products) {
        setProducts(response.products)
      } else {
        setError(response.error || 'Failed to fetch products')
        setProducts([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))]

  // Filter products based on search and category
  const filteredProducts = products.filter((product) => {
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      product.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.color.toLowerCase().includes(searchQuery.toLowerCase())

    // Category filter
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    filteredProducts,
    categories,
  }
}
