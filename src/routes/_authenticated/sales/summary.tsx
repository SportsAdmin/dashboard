import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SalesSummaryPage } from '@/features/sales/summary'

const summarySearchSchema = z.object({
  period: z.enum(['week', 'month', 'year']).optional().catch(undefined),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  size: z.coerce.number().int().min(5).max(100).optional().catch(undefined),
  club: z.string().uuid().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/sales/summary')({
  component: SalesSummaryPage,
  validateSearch: summarySearchSchema,
})
