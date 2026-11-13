import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DailySales } from '@/features/sales/daily'

const dailySearchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  size: z.coerce.number().int().min(5).max(100).optional().catch(undefined),
  club: z.string().uuid().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/sales/')({
  component: DailySales,
  validateSearch: dailySearchSchema,
})
