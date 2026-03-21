import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Eye, Pencil, Search } from 'lucide-react'
import { format } from 'date-fns'
import { useClubs, type ClubData } from '@/hooks/use-clubs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ClubsTable() {
  const { clubs, loading, error } = useClubs()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')

  // Get unique cities for filter
  const uniqueCities = useMemo(() => {
    const cities = clubs.map((club) => club.city)
    return Array.from(new Set(cities)).sort()
  }, [clubs])

  // Filter clubs based on search and city filter
  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesSearch = club.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesCity = !cityFilter || club.city === cityFilter

      return matchesSearch && matchesCity
    })
  }, [clubs, searchQuery, cityFilter])

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clubs</CardTitle>
          <CardDescription>Loading clubs...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clubs</CardTitle>
          <CardDescription>Error loading clubs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='rounded-md bg-destructive/10 p-4 text-sm text-destructive'>
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (clubs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clubs</CardTitle>
          <CardDescription>No clubs found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <div className='rounded-full bg-muted p-4 mb-4'>
              <Search className='h-8 w-8 text-muted-foreground' />
            </div>
            <h3 className='text-lg font-semibold mb-2'>No clubs yet</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              Get started by creating your first club
            </p>
            <Button onClick={() => navigate({ to: '/clubs/create' })}>
              Create Club
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clubs</CardTitle>
        <CardDescription>
          {filteredClubs.length} of {clubs.length} club
          {clubs.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filter */}
        <div className='mb-4 flex flex-col gap-4 sm:flex-row'>
          <div className='relative flex-1'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search by club name...'
              className='pl-8'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {uniqueCities.length > 0 && (
            <select
              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[200px]'
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value=''>All Cities</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        {filteredClubs.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-8 text-center'>
            <Search className='h-12 w-12 text-muted-foreground mb-2' />
            <p className='text-sm text-muted-foreground'>
              No clubs match your search criteria
            </p>
            <Button
              variant='link'
              size='sm'
              onClick={() => {
                setSearchQuery('')
                setCityFilter('')
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell className='font-medium'>{club.name}</TableCell>
                    <TableCell>{club.city}</TableCell>
                    <TableCell>
                      {format(new Date(club.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() =>
                            navigate({ to: `/clubs/${club.id}` })
                          }
                        >
                          <Eye className='h-4 w-4' />
                          <span className='sr-only'>View</span>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() =>
                            navigate({ to: `/clubs/${club.id}/edit` })
                          }
                        >
                          <Pencil className='h-4 w-4' />
                          <span className='sr-only'>Edit</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
