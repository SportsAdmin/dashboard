import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sale, SaleItem } from '@/types'

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (salesError) throw salesError

      if (!data) {
        setSales([])
        return
      }

      const mappedSales: Sale[] = data.map((sale: Sale) => ({
        id: sale.id,
        customerName: sale.customer_name,
        total: sale.total,
        tax: sale.tax,
        paymentMethod: sale.payment_method,
        createdAt: sale.created_at,
      }))

      setSales(mappedSales)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  const createSale = async (
    customerName: string | null,
    items: SaleItem[],
    paymentMethod: string
  ) => {
    // eslint-disable-next-line no-useless-catch
    try {
      // Calculate totals
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
      const tax = subtotal * 0.1 // 10% tax
      const total = subtotal + tax

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_name: customerName,
          total,
          tax,
          payment_method: paymentMethod,
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = items.map((item: Sale) => ({
        sale_id: sale.id,
        variant_id: item.variantId,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Update inventory stock
      for (const item of items) {
        // Get current stock
        const { data: inventoryData } = await supabase
          .from('inventory_items')
          .select('stock')
          .eq('variant_id', item.variantId)
          .single()

        if (inventoryData) {
          const newStock = inventoryData.stock - item.quantity

          // Update stock
          await supabase
            .from('inventory_items')
            .update({ stock: Math.max(0, newStock) })
            .eq('variant_id', item.variantId)
        }
      }

      // Refresh sales list
      await fetchSales()

      return sale
    } catch (err) {
      throw err
    }
  }

  const getSalesStats = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const salesToday = sales.filter(
      (sale) => new Date(sale.createdAt) >= today
    )
    const salesTodayTotal = salesToday.reduce(
      (sum, sale) => sum + sale.total,
      0
    )

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const salesThisMonth = sales.filter(
      (sale) => new Date(sale.createdAt) >= thisMonth
    )
    const salesThisMonthTotal = salesThisMonth.reduce(
      (sum, sale) => sum + sale.total,
      0
    )

    return {
      salesToday: salesTodayTotal,
      salesThisMonth: salesThisMonthTotal,
      totalOrders: sales.length,
    }
  }

  return {
    sales,
    loading,
    error,
    createSale,
    getSalesStats,
    refresh: fetchSales,
  }
}
