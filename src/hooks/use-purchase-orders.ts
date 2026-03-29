import { useEffect, useState } from 'react'
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  type PurchaseOrder,
  type CreatePurchaseOrderPayload,
  type UpdatePurchaseOrderPayload,
} from '@/services/purchaseOrders'

interface UsePurchaseOrdersReturn {
  purchaseOrders: PurchaseOrder[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createOrder: (
    payload: CreatePurchaseOrderPayload
  ) => Promise<{ success: boolean; error?: string; purchaseOrderId?: string }>
  updateOrder: (
    id: string,
    payload: UpdatePurchaseOrderPayload
  ) => Promise<{ success: boolean; error?: string }>
  deleteOrder: (id: string) => Promise<{ success: boolean; error?: string }>
}

/**
 * Custom hook for fetching and managing purchase orders
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Refetch functionality
 * - CRUD operations (create, update, delete)
 *
 * @returns {UsePurchaseOrdersReturn} Purchase orders data, loading state, error, and CRUD functions
 *
 * @example
 * function PurchaseOrderList() {
 *   const { purchaseOrders, loading, error, refetch, createOrder } = usePurchaseOrders()
 *
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *
 *   return (
 *     <div>
 *       {purchaseOrders.map(order => (
 *         <div key={order.id}>{order.supplier} - {order.status}</div>
 *       ))}
 *     </div>
 *   )
 * }
 */
export function usePurchaseOrders(): UsePurchaseOrdersReturn {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getPurchaseOrders()

      if (response.success && response.purchaseOrders) {
        setPurchaseOrders(response.purchaseOrders)
      } else {
        setError(response.error || 'Failed to fetch purchase orders')
        setPurchaseOrders([])
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      setPurchaseOrders([])
    } finally {
      setLoading(false)
    }
  }

  const createOrder = async (payload: CreatePurchaseOrderPayload) => {
    try {
      const response = await createPurchaseOrder(payload)

      if (response.success) {
        // Refetch to get the updated list
        await fetchPurchaseOrders()
      }

      return response
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unexpected error occurred'
      return {
        success: false,
        error,
      }
    }
  }

  const updateOrder = async (
    id: string,
    payload: UpdatePurchaseOrderPayload
  ) => {
    try {
      const response = await updatePurchaseOrder(id, payload)

      if (response.success) {
        // Refetch to get the updated list
        await fetchPurchaseOrders()
      }

      return response
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unexpected error occurred'
      return {
        success: false,
        error,
      }
    }
  }

  const deleteOrder = async (id: string) => {
    try {
      const response = await deletePurchaseOrder(id)

      if (response.success) {
        // Refetch to get the updated list
        await fetchPurchaseOrders()
      }

      return response
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unexpected error occurred'
      return {
        success: false,
        error,
      }
    }
  }

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  return {
    purchaseOrders,
    loading,
    error,
    refetch: fetchPurchaseOrders,
    createOrder,
    updateOrder,
    deleteOrder,
  }
}

interface UsePurchaseOrderReturn {
  purchaseOrder: PurchaseOrder | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching a single purchase order
 *
 * @param {string} id - Purchase order ID
 * @returns {UsePurchaseOrderReturn} Purchase order data, loading state, error, and refetch function
 */
export function usePurchaseOrder(id: string): UsePurchaseOrderReturn {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getPurchaseOrder(id)

      if (response.success && response.purchaseOrder) {
        setPurchaseOrder(response.purchaseOrder)
      } else {
        setError(response.error || 'Failed to fetch purchase order')
        setPurchaseOrder(null)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      setPurchaseOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchPurchaseOrder()
    }
  }, [id])

  return {
    purchaseOrder,
    loading,
    error,
    refetch: fetchPurchaseOrder,
  }
}
