import { useEffect, useState } from 'react'
import { getClubs } from '@/services/clubs'
import type { Club } from '@/types'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ClubSelectProps = {
  id?: string
  value: string
  onChange: (clubId: string) => void
  error?: string
  disabled?: boolean
  /** Filter mode: adds "All clubs" (value '') and drops the required mark/hint */
  allowAll?: boolean
}

const ALL = '__all__'

/**
 * Club picker for admins. Admins have no club of their own, so the DB requires
 * them to say which club a product / purchase order belongs to (p_club_id).
 * Managers and sellers never see it: the DB always uses their own club.
 */
export function ClubSelect({
  id = 'club_id',
  value,
  onChange,
  error,
  disabled,
  allowAll = false,
}: ClubSelectProps) {
  const { t } = useTranslation()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClubs()
      .then((response) => {
        if (response.success) setClubs(response.clubs ?? [])
        else toast.error(response.error ?? t('clubSelect.loadError'))
      })
      .finally(() => setLoading(false))
  }, [t])

  return (
    <div className='space-y-1.5'>
      <Label htmlFor={id}>
        {t('clubSelect.label')}
        {!allowAll && ' *'}
      </Label>
      <Select
        value={allowAll && !value ? ALL : value}
        onValueChange={(next) => onChange(next === ALL ? '' : next)}
        disabled={disabled || loading}
      >
        <SelectTrigger id={id} className='w-full' aria-invalid={!!error}>
          <SelectValue
            placeholder={
              loading ? t('clubSelect.loading') : t('clubSelect.placeholder')
            }
          />
        </SelectTrigger>
        <SelectContent>
          {allowAll && (
            <SelectItem value={ALL}>{t('clubSelect.all')}</SelectItem>
          )}
          {clubs.map((club) => (
            <SelectItem key={club.id} value={club.id}>
              {club.name}
              {club.city ? ` · ${club.city}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!allowAll && (
        <p className='text-xs text-muted-foreground'>{t('clubSelect.hint')}</p>
      )}
      {error && <p className='text-xs text-destructive'>{error}</p>}
    </div>
  )
}
