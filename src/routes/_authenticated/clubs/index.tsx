import { createFileRoute } from '@tanstack/react-router'
import { getClubs } from '@/services/clubs'
import { ClubsList } from '@/features/clubs/clubs-list'

export const Route = createFileRoute('/_authenticated/clubs/')({
  // Loader to preload clubs data
  loader: async () => {
    const response = await getClubs()
    return {
      clubs: response.success && response.clubs ? response.clubs : [],
      error: response.error || null,
    }
  },
  component: ClubsList,
})
