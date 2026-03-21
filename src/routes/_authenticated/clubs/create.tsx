import { createFileRoute } from '@tanstack/react-router'
import { CreateClub } from '@/features/clubs'

export const Route = createFileRoute('/_authenticated/clubs/create')({
  component: CreateClub,
})
