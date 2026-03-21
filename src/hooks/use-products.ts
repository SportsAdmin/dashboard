import { useEffect, useState } from 'react'
import {
  getProducts,
  createProduct as createProductService,
  type ProductWithVariants,
  type CreateProductPayload,
} from '@/services/products'
import { type Product } from '@/features/products/data/schema'

interface UseProductsReturn {
  products: Product[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createProduct: (payload: CreateProductPayload) => Promise<{
    success: boolean
    error?: string
  }>
}

/**
 * Custom hook for fetching and managing products data
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Refetch functionality
 * - Transforms database products to UI-friendly format
 *
 * @returns {UseProductsReturn} Products data, loading state, error, and refetch function
 *
 * @example
 * function ProductsList() {
 *   const { products, loading, error, refetch } = useProducts()
 *
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *
 *   return (
 *     <div>
 *       {products.map(product => (
 *         <div key={product.id}>{product.name}</div>
 *       ))}
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   )
 * }
 */
export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getProducts()

      if (response.success && response.products) {
        // Transform database format to UI format
        const transformedProducts: Product[] = response.products.map(
          (product: ProductWithVariants) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            createdAt: product.created_at,
            variants: product.variants.map((v) => ({
              id: v.id,
              size_id: v.size_id,
              color: v.color,
              price: v.price,
              price_sale: v.price_sale,
              stock: 0, // Will be populated by inventory
            })),
          })
        )

        setProducts(transformedProducts)
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

  const createProduct = async (
    payload: CreateProductPayload
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await createProductService(payload)

      if (response.success) {
        // Refresh the products list after successful creation
        await fetchProducts()
      }

      return {
        success: response.success,
        error: response.error,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }
    }
  }

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
  }
}
