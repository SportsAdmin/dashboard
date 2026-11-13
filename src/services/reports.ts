import type { PaymentMethod } from '@/services/sales'
import { supabase } from '@/lib/supabase'

/**
 * Sales reports. Filtering, aggregation and pagination run in the database
 * (RPC sales_summary / sales_list); dates are local (Argentina) calendar days
 * as 'yyyy-MM-dd'. RLS limits managers to their club; admins may pass a club.
 */

export interface SalesTotals {
  sales: number
  amount: number
  avg_ticket: number
  units: number
}

export interface SalesSummary {
  from: string
  to: string
  bucket: 'day' | 'month'
  totals: SalesTotals
  by_method: { method: PaymentMethod; sales: number; amount: number }[]
  series: { bucket: string; sales: number; amount: number }[]
  top_products: {
    product: string
    size: string | null
    color: string | null
    units: number
    amount: number
  }[]
  by_seller: {
    seller_id: string | null
    seller: string
    sales: number
    amount: number
  }[]
  returns: {
    count: number
    units: number
    restocked_units: number
    amount: number
  }
}

export interface SaleRow {
  id: string
  number: string
  created_at: string
  total: number
  club: string | null
  seller: string | null
  customer: string | null
  items: {
    product: string
    size: string | null
    color: string | null
    quantity: number
    price: number
  }[]
  payments: { method: PaymentMethod; amount: number }[]
  returned_units: number
}

export interface SalesPage {
  total_count: number
  page: number
  page_size: number
  page_count: number
  rows: SaleRow[]
}

export interface ReportRange {
  from: string
  to: string
  /** Admin only: restrict to one club. Managers always get their own. */
  clubId?: string | null
}

export async function getSalesSummary({
  from,
  to,
  clubId,
}: ReportRange): Promise<SalesSummary> {
  const { data, error } = await supabase.rpc(
    'sales_summary' as never,
    { p_from: from, p_to: to, p_club_id: clubId ?? null } as never
  )
  if (error) throw new Error(error.message)
  return data as unknown as SalesSummary
}

export async function getSalesPage(
  range: ReportRange & { page: number; pageSize: number }
): Promise<SalesPage> {
  const { data, error } = await supabase.rpc(
    'sales_list' as never,
    {
      p_from: range.from,
      p_to: range.to,
      p_club_id: range.clubId ?? null,
      p_page: range.page,
      p_page_size: range.pageSize,
    } as never
  )
  if (error) throw new Error(error.message)
  return data as unknown as SalesPage
}
