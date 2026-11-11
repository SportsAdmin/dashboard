import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/use-permissions'
import { useSizes } from '@/hooks/use-sizes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClubSelect } from '@/components/club-select'
import { productFormSchema, type ProductFormData } from '../data/schema'
import { VariantInputs } from './variant-inputs'

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
  const { t } = useTranslation()
  const { sizes, loading: sizesLoading } = useSizes()
  const { isAdmin } = usePermissions()
  const requireClub = isAdmin()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      club_id: '',
      variants: [{ size_id: '', color: '', price: 0, price_sale: null }],
    },
  })

  const variantsFieldArray = useFieldArray({
    control,
    name: 'variants',
  })

  const handleFormSubmit = async (data: ProductFormData) => {
    if (requireClub && !data.club_id) {
      setError('club_id', { message: t('clubSelect.required') })
      return
    }
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
          <DialogTitle>{t('products.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('products.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <ScrollArea className='max-h-[60vh] pr-4'>
            <div className='space-y-6 py-4'>
              {/* Product Details */}
              <div className='space-y-4'>
                {requireClub && (
                  <ClubSelect
                    value={watch('club_id') ?? ''}
                    onChange={(clubId) => {
                      setValue('club_id', clubId)
                      clearErrors('club_id')
                    }}
                    error={errors.club_id?.message}
                    disabled={isSubmitting}
                  />
                )}
                <div className='space-y-1.5'>
                  <Label htmlFor='name'>{t('products.dialog.name')} *</Label>
                  <Input
                    id='name'
                    placeholder={t('products.dialog.namePlaceholder')}
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
                  <Label htmlFor='category'>
                    {t('products.dialog.category')} *
                  </Label>
                  <Input
                    id='category'
                    placeholder={t('products.dialog.categoryPlaceholder')}
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
                  <Label htmlFor='description'>
                    {t('products.dialog.description')} *
                  </Label>
                  <Input
                    id='description'
                    placeholder={t('products.dialog.descriptionPlaceholder')}
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
              {t('products.dialog.cancel')}
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && <Loader2 className='mr-2 size-4 animate-spin' />}
              {isSubmitting
                ? t('products.dialog.creating')
                : t('products.dialog.createProduct')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
