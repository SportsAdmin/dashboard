import type { Database } from '@/lib/database.types'

// ============================================
// Database Types
// ============================================

export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']

// ============================================
// Service Input Types
// ============================================

export interface CreateCustomerPayload {
  name: string
  phone: string
  email: string
}

export interface UpdateCustomerPayload {
  name?: string
  phone?: string
  email?: string
}

// ============================================
// Service Response Types
// ============================================

export interface CustomersResponse {
  success: boolean
  error?: string
  customers?: Customer[]
}

export interface CustomerResponse {
  success: boolean
  error?: string
  customer?: Customer
}

export interface CreateCustomerResponse {
  success: boolean
  error?: string
  customerId?: string
}

export interface UpdateCustomerResponse {
  success: boolean
  error?: string
}

export interface DeleteCustomerResponse {
  success: boolean
  error?: string
}
