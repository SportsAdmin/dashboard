import type { Database } from '@/lib/database.types'

// ============================================
// Database Types
// ============================================

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// ============================================
// Service Response Types
// ============================================

export interface ProfileResponse {
  success: boolean
  error?: string
  profile?: Profile
}

// ============================================
// Roles
// ============================================

export type UserRole = 'admin' | 'store_manager' | 'cashier' | 'viewer'

export const USER_ROLES: Record<UserRole, string> = {
  admin: 'Admin',
  store_manager: 'Store Manager',
  cashier: 'Cashier',
  viewer: 'Viewer',
} as const
