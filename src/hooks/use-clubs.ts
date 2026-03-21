import { useEffect, useState } from 'react'
import { getClubs } from '@/services/clubs'

export interface ClubData {
  id: string
  name: string
  city: string
  logo_url: string | null
  created_at: string
}

interface UseClubsReturn {
  clubs: ClubData[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching and managing clubs data
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Refetch functionality
 *
 * @returns {UseClubsReturn} Clubs data, loading state, error, and refetch function
 *
 * @example
 * function ClubsList() {
 *   const { clubs, loading, error, refetch } = useClubs()
 *
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *
 *   return (
 *     <div>
 *       {clubs.map(club => (
 *         <div key={club.id}>{club.name}</div>
 *       ))}
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   )
 * }
 */
export function useClubs(): UseClubsReturn {
  const [clubs, setClubs] = useState<ClubData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClubs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getClubs()

      if (response.success && response.clubs) {
        setClubs(response.clubs)
      } else {
        setError(response.error || 'Failed to fetch clubs')
        setClubs([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setClubs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  return {
    clubs,
    loading,
    error,
    refetch: fetchClubs,
  }
}
