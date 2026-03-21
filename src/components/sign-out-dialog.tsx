import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      // Call Supabase signOut directly
      const { error } = await supabase.auth.signOut()

      if (error) {
        setIsLoading(false)
        toast.error('Sign out failed', {
          description: error.message,
        })
        return
      }

      // Success - close dialog and redirect
      onOpenChange(false)

      // Use window.location for a clean redirect without loading state issues
      window.location.href = '/sign-in'
    } catch (error) {
      setIsLoading(false)
      toast.error('Sign out failed', {
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      desc='Are you sure you want to sign out? You will need to sign in again to access your account.'
      confirmText={isLoading ? 'Signing out...' : 'Sign out'}
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
      disabled={isLoading}
    />
  )
}
