import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { customerFormSchema, type CustomerFormData } from '../data/schema'

type AddCustomerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CustomerFormData) => void
}

export function AddCustomerDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddCustomerDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
    },
  })

  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      onSubmit(data)
      toast.success(`${data.name} has been added successfully`)
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to add customer')
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your database
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-4 py-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='name'>Name *</Label>
              <Input
                id='name'
                placeholder='e.g., John Smith'
                {...register('name')}
              />
              {errors.name && (
                <p className='text-xs text-destructive'>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='phone'>Phone *</Label>
              <Input
                id='phone'
                placeholder='e.g., +1 (555) 123-4567'
                {...register('phone')}
              />
              {errors.phone && (
                <p className='text-xs text-destructive'>
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='email'>Email *</Label>
              <Input
                id='email'
                type='email'
                placeholder='e.g., john@email.com'
                {...register('email')}
              />
              {errors.email && (
                <p className='text-xs text-destructive'>
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
