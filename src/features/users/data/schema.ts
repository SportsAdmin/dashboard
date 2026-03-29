import { z } from 'zod'

/**
 * User roles matching Supabase profiles table
 */
const userRoleSchema = z.union([
  z.literal('admin'),
  z.literal('manager'),
  z.literal('seller'),
])
export type UserRole = z.infer<typeof userRoleSchema>

/**
 * User schema matching data from Supabase
 * Combines profiles table with auth.users email
 */
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  role: userRoleSchema,
  club_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)
