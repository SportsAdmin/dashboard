import { Shield, Users, ShoppingCart } from 'lucide-react'

/**
 * User roles matching Supabase profiles table
 */
export const roles = [
  {
    label: 'Admin',
    value: 'admin',
    icon: Shield,
  },
  {
    label: 'Manager',
    value: 'manager',
    icon: Users,
  },
  {
    label: 'Seller',
    value: 'seller',
    icon: ShoppingCart,
  },
] as const
