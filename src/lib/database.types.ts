export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clubs: {
        Row: {
          id: string
          name: string
          city: string
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          city: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          city?: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          role: string
          club_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: string
          club_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          club_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category: string
          club_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          // club_id is set automatically by Supabase trigger/RLS
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          // club_id should not be updated
          created_at?: string
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          size_id: string
          color: string
          price: number
          price_sale: number | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          size_id: string
          color: string
          price: number
          price_sale?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          size_id?: string
          color?: string
          price?: number
          price_sale?: number | null
          created_at?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          variant_id: string
          stock: number
          updated_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          stock?: number
          updated_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          stock?: number
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          customer_name: string | null
          total: number
          tax: number
          payment_method: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_name?: string | null
          total: number
          tax: number
          payment_method: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string | null
          total?: number
          tax?: number
          payment_method?: string
          created_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          variant_id: string
          quantity: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          variant_id: string
          quantity: number
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          variant_id?: string
          quantity?: number
          price?: number
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string
          created_at?: string
        }
      }
      sizes: {
        Row: {
          id: string
          name: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          order_index?: number
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          club_id: string
          supplier: string
          status: 'pending' | 'approved' | 'in_production' | 'shipped' | 'delivered'
          expected_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          club_id?: string
          supplier: string
          status?: 'pending' | 'approved' | 'in_production' | 'shipped' | 'delivered'
          expected_date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          supplier?: string
          status?: 'pending' | 'approved' | 'in_production' | 'shipped' | 'delivered'
          expected_date?: string
          notes?: string | null
          created_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          inventory_item_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          inventory_item_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          inventory_item_id?: string
          quantity?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
