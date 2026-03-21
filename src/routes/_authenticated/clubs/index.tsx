import { createFileRoute } from '@tanstack/react-router'
import { ClubsList } from '@/features/clubs/clubs-list'

export const Route = createFileRoute('/_authenticated/clubs/')({
  component: ClubsList,
})
