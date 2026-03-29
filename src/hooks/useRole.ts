import { useAuthStore, Role } from '@/store/useAuthStore'

interface UseRoleReturn {
  role: Role | null
  club_id: string | null
  name: string | null
  loading: boolean
  isAdmin: boolean
  isManager: boolean
  isSeller: boolean
}

export function useRole(): UseRoleReturn {
  const { profile, loading } = useAuthStore()

  const role = (profile?.role as Role) || null
  const club_id = profile?.club_id || null
  const name = profile?.name || null

  return {
    role,
    club_id,
    name,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isSeller: role === 'seller'
  }
}
