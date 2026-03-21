import { z } from 'zod'

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  createdAt: z.string(),
})

export type Customer = z.infer<typeof customerSchema>

// Form schema
export const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address'),
})

export type CustomerFormData = z.infer<typeof customerFormSchema>
