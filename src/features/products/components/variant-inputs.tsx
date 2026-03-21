import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type UseFieldArrayReturn, type Control, Controller } from 'react-hook-form'
import { type ProductFormData } from '../data/schema'
import { type Size } from '@/services/sizes'

type VariantInputsProps = {
  fieldArray: UseFieldArrayReturn<ProductFormData, 'variants', 'id'>
  control: Control<ProductFormData>
  register: any
  errors: any
  disabled?: boolean
  sizes?: Size[]
  sizesLoading?: boolean
}

export function VariantInputs({
  fieldArray,
  control,
  register,
  errors,
  disabled = false,
  sizes = [],
  sizesLoading = false,
}: VariantInputsProps) {
  const { fields, append, remove } = fieldArray

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <Label>Variants</Label>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => append({ size_id: '', color: '', price: 0, price_sale: null })}
          disabled={disabled}
        >
          <Plus className='mr-2 size-4' />
          Add Variant
        </Button>
      </div>

      {fields.length === 0 && (
        <div className='rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground'>
          No variants added. Click "Add Variant" to create one.
        </div>
      )}

      <div className='space-y-3'>
        {fields.map((field, index) => (
          <Card key={field.id} className='p-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>
                  Variant {index + 1}
                </span>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-8 text-muted-foreground hover:text-destructive'
                  onClick={() => remove(index)}
                  disabled={disabled || fields.length === 1}
                >
                  <Trash2 className='size-4' />
                </Button>
              </div>

              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label htmlFor={`variants.${index}.size_id`}>Size</Label>
                  <Controller
                    name={`variants.${index}.size_id`}
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={disabled || sizesLoading || sizes.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              sizesLoading
                                ? 'Loading sizes...'
                                : sizes.length === 0
                                  ? 'No sizes available'
                                  : 'Select size'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {sizes.map((size) => (
                            <SelectItem key={size.id} value={size.id}>
                              {size.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors?.variants?.[index]?.size_id && (
                    <p className='text-xs text-destructive'>
                      {errors.variants[index].size_id.message}
                    </p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor={`variants.${index}.color`}>Color</Label>
                  <Input
                    id={`variants.${index}.color`}
                    placeholder='e.g., Red, Blue'
                    disabled={disabled}
                    {...register(`variants.${index}.color`)}
                  />
                  {errors?.variants?.[index]?.color && (
                    <p className='text-xs text-destructive'>
                      {errors.variants[index].color.message}
                    </p>
                  )}
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label htmlFor={`variants.${index}.price`}>
                    Price *
                  </Label>
                  <Input
                    id={`variants.${index}.price`}
                    type='number'
                    step='0.01'
                    placeholder='0.00'
                    disabled={disabled}
                    {...register(`variants.${index}.price`)}
                  />
                  {errors?.variants?.[index]?.price && (
                    <p className='text-xs text-destructive'>
                      {errors.variants[index].price.message}
                    </p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor={`variants.${index}.price_sale`}>
                    Sale Price (Optional)
                  </Label>
                  <Input
                    id={`variants.${index}.price_sale`}
                    type='number'
                    step='0.01'
                    placeholder='0.00'
                    disabled={disabled}
                    {...register(`variants.${index}.price_sale`)}
                  />
                  {errors?.variants?.[index]?.price_sale && (
                    <p className='text-xs text-destructive'>
                      {errors.variants[index].price_sale.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
