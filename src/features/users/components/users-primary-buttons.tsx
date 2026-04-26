import { MailPlus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRole } from '@/hooks/useRole'
import { canCreateUsers } from '@/lib/permissions'
import { useUsers } from './users-provider'
import i18n from '@/lib/i18n'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()
  const { role } = useRole()

  // Only admin and manager can create users
  const canCreate = canCreateUsers(role)

  // Don't render buttons if user doesn't have permission
  if (!canCreate) {
    return null
  }

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('invite')}
      >
        <span>{i18n.t('users.invite')}</span> <MailPlus size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>{i18n.t('users.addUser')}</span> <UserPlus size={18} />
      </Button>
    </div>
  )
}
