import { useEffect, useState } from 'react'
import { getUsers, checkUserAccess, type User, type UserRole } from '@/services/users'

/**
 * Return type for useUsers hook
 */
interface UseUsersReturn {
  users: User[]
  loading: boolean
  error: string | null
  hasAccess: boolean
  currentUserRole: UserRole | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching and managing users from Supabase
 *
 * Features:
 * - Fetches users with role-based filtering
 * - Admin: sees all users
 * - Manager: sees only users from same club
 * - Seller: no access (hasAccess = false)
 * - Automatic data fetching on mount
 * - Loading and error states
 * - Refetch functionality
 *
 * @returns {UseUsersReturn} Users array, loading state, error, access control, and refetch function
 *
 * @example
 * function UsersPage() {
 *   const { users, loading, error, hasAccess } = useUsers()
 *
 *   if (loading) return <Loader />
 *   if (!hasAccess) return <Unauthorized />
 *   if (error) return <ErrorMessage error={error} />
 *
 *   return <UsersTable data={users} />
 * }
 */
export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check access first (now synchronous - uses store)
      const accessCheck = checkUserAccess()
      setHasAccess(accessCheck.hasAccess)
      setCurrentUserRole(accessCheck.role)

      // If no access, don't fetch users
      if (!accessCheck.hasAccess) {
        setUsers([])
        setLoading(false)
        return
      }

      // Fetch users
      const usersData = await getUsers()
      setUsers(usersData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users'
      setError(errorMessage)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    loading,
    error,
    hasAccess,
    currentUserRole,
    refetch: fetchUsers,
  }
}
