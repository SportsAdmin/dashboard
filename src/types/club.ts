import type { Database } from '@/lib/database.types'

// ============================================
// Database Types
// ============================================

export type Club = Database['public']['Tables']['clubs']['Row']
export type ClubInsert = Database['public']['Tables']['clubs']['Insert']
export type ClubUpdate = Database['public']['Tables']['clubs']['Update']

// ============================================
// Service Input Types
// ============================================

export interface ClubData {
  name: string
  city: string
  logo_url?: string | null
}

export interface AdminData {
  name: string
  email: string
  password: string
}

export interface CreateClubPayload {
  club: ClubData
  admin: AdminData
}

// ============================================
// Service Response Types
// ============================================

export interface CreateClubResponse {
  success: boolean
  error?: string
  clubId?: string
  userId?: string
}

export interface ClubsResponse {
  success: boolean
  error?: string
  clubs?: Club[]
}

export interface ClubResponse {
  success: boolean
  error?: string
  club?: Club
}
