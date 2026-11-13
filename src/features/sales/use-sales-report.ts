import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getSalesPage, getSalesSummary } from '@/services/reports'

type Params = {
  from: string
  to: string
  clubId: string | null
  page: number
  pageSize: number
}

/**
 * Summary + one page of sales for a date range. Each filter/page combination
 * is its own query (fetched from the DB); while a new one loads, the previous
 * results stay on screen.
 */
export function useSalesReport({ from, to, clubId, page, pageSize }: Params) {
  const summary = useQuery({
    queryKey: ['sales-summary', from, to, clubId],
    queryFn: () => getSalesSummary({ from, to, clubId }),
    placeholderData: keepPreviousData,
  })

  const list = useQuery({
    queryKey: ['sales-list', from, to, clubId, page, pageSize],
    queryFn: () => getSalesPage({ from, to, clubId, page, pageSize }),
    placeholderData: keepPreviousData,
  })

  return { summary, list }
}
