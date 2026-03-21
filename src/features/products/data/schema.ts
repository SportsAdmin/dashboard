import { z } from 'zod'

export const variantSchema = z.object({
  id: z.string(),
  size_id: z.string(),
  color: z.string(),
  price: z.number(),
  price_sale: z.number().nullable().optional(),
  stock: z.number().default(0),
})

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  variants: z.array(variantSchema),
  createdAt: z.string(),
})

export type Variant = z.infer<typeof variantSchema>
export type Product = z.infer<typeof productSchema>

// Form schemas
export const variantFormSchema = z.object({
  size_id: z.string().min(1, 'Size is required'),
  color: z.string().min(1, 'Color is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  price_sale: z.coerce.number().min(0, 'Sale price must be positive').optional().nullable(),
})

export const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  variants: z.array(variantFormSchema).min(1, 'At least one variant is required'),
})

export type VariantFormData = z.infer<typeof variantFormSchema>
export type ProductFormData = z.infer<typeof productFormSchema>
