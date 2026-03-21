import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { productFormSchema, type ProductFormData } from '../data/schema'
import { VariantInputs } from './variant-inputs'
import { useSizes } from '@/hooks/use-sizes'

type ProductFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProductFormData) => Promise<boolean>
}

export function ProductFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: ProductFormDialogProps) {
  const { sizes, loading: sizesLoading } = useSizes()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      variants: [{ size_id: '', color: '', price: 0, price_sale: null }],
    },
  })

  const variantsFieldArray = useFieldArray({
    control,
    name: 'variants',
  })

  const handleFormSubmit = async (data: ProductFormData) => {
    const success = await onSubmit(data)

    // Only reset and close if submission was successful
    if (success) {
      reset()
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Add a new product with variants to your inventory
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <ScrollArea className='max-h-[60vh] pr-4'>
            <div className='space-y-6 py-4'>
              {/* Product Details */}
              <div className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='name'>Product Name *</Label>
                  <Input
                    id='name'
                    placeholder='e.g., Running Shoes Pro'
                    disabled={isSubmitting}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className='text-xs text-destructive'>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='category'>Category *</Label>
                  <Input
                    id='category'
                    placeholder='e.g., Footwear, Apparel, Equipment'
                    disabled={isSubmitting}
                    {...register('category')}
                  />
                  {errors.category && (
                    <p className='text-xs text-destructive'>
                      {errors.category.message}
                    </p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='description'>Description *</Label>
                  <Input
                    id='description'
                    placeholder='e.g., Professional running shoes for athletes'
                    disabled={isSubmitting}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className='text-xs text-destructive'>
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Variants */}
              <VariantInputs
                fieldArray={variantsFieldArray}
                control={control}
                register={register}
                errors={errors}
                disabled={isSubmitting}
                sizes={sizes}
                sizesLoading={sizesLoading}
              />

              {errors.variants?.root && (
                <p className='text-sm text-destructive'>
                  {errors.variants.root.message}
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className='mt-6'>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && <Loader2 className='mr-2 size-4 animate-spin' />}
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
