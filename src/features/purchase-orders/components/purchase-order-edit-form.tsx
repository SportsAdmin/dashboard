import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInventory } from '@/hooks/use-inventory'
import {
  type PurchaseOrder,
  type UpdatePurchaseOrderPayload,
} from '@/services/purchaseOrders'
import { statusOptions } from '../data/data'

// Form schema
const purchaseOrderEditFormSchema = z.object({
  supplier: z.string().min(1, 'Supplier name is required'),
  status: z.enum([
    'pending',
    'approved',
    'in_production',
    'shipped',
    'delivered',
  ]),
  expected_date: z.string().min(1, 'Expected date is required'),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        inventory_item_id: z.string().min(1, 'Please select a product'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'At least one item is required'),
})

type PurchaseOrderEditFormData = z.infer<typeof purchaseOrderEditFormSchema>

type PurchaseOrderEditFormProps = {
  purchaseOrder: PurchaseOrder
  onSubmit: (data: UpdatePurchaseOrderPayload) => Promise<boolean>
  onCancel: () => void
  isSubmitting?: boolean
}

export function PurchaseOrderEditForm({
  purchaseOrder,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PurchaseOrderEditFormProps) {
  const { inventory, loading: inventoryLoading } = useInventory()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PurchaseOrderEditFormData>({
    resolver: zodResolver(purchaseOrderEditFormSchema),
    defaultValues: {
      supplier: purchaseOrder.supplier,
      status: purchaseOrder.status,
      expected_date: purchaseOrder.expected_date?.split('T')[0] || '',
      notes: purchaseOrder.notes || '',
      items:
        purchaseOrder.purchase_order_items?.map((item) => ({
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
        })) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  // Reset form when purchase order changes
  useEffect(() => {
    reset({
      supplier: purchaseOrder.supplier,
      status: purchaseOrder.status,
      expected_date: purchaseOrder.expected_date?.split('T')[0] || '',
      notes: purchaseOrder.notes || '',
      items:
        purchaseOrder.purchase_order_items?.map((item) => ({
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
        })) || [],
    })
  }, [purchaseOrder, reset])

  const handleFormSubmit = async (data: PurchaseOrderEditFormData) => {
    await onSubmit(data)
  }

  const addItem = () => {
    append({ inventory_item_id: '', quantity: 1 })
  }

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-6'>
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='supplier'>Supplier *</Label>
              <Input
                id='supplier'
                placeholder='e.g., Nike, Adidas'
                disabled={isSubmitting}
                {...register('supplier')}
              />
              {errors.supplier && (
                <p className='text-xs text-destructive'>
                  {errors.supplier.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='status'>Status *</Label>
              <Select
                disabled={isSubmitting}
                onValueChange={(value) => setValue('status', value as any)}
                defaultValue={purchaseOrder.status}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select status' />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className='text-xs text-destructive'>
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='expected_date'>Expected Delivery Date *</Label>
              <Input
                id='expected_date'
                type='date'
                disabled={isSubmitting}
                {...register('expected_date')}
              />
              {errors.expected_date && (
                <p className='text-xs text-destructive'>
                  {errors.expected_date.message}
                </p>
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='notes'>Notes</Label>
            <Textarea
              id='notes'
              placeholder='Additional notes or special instructions...'
              disabled={isSubmitting}
              rows={3}
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>Order Items</CardTitle>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addItem}
            disabled={isSubmitting || inventoryLoading}
          >
            <Plus className='mr-2 h-4 w-4' />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className='space-y-4'>
          {inventoryLoading && (
            <p className='text-center text-sm text-muted-foreground'>
              Loading products...
            </p>
          )}

          {!inventoryLoading && fields.length === 0 && (
            <p className='text-center text-sm text-muted-foreground'>
              No items added yet. Click "Add Item" to get started.
            </p>
          )}

          {!inventoryLoading &&
            fields.map((field, index) => (
              <div
                key={field.id}
                className='flex gap-4 rounded-lg border p-4'
              >
                <div className='flex-1 space-y-2'>
                  <Label htmlFor={`items.${index}.inventory_item_id`}>
                    Product *
                  </Label>
                  <Select
                    disabled={isSubmitting}
                    onValueChange={(value) =>
                      setValue(`items.${index}.inventory_item_id`, value)
                    }
                    defaultValue={field.inventory_item_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select a product' />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.productName} - {item.size} - {item.color} (Stock:{' '}
                          {item.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.items?.[index]?.inventory_item_id && (
                    <p className='text-xs text-destructive'>
                      {errors.items[index]?.inventory_item_id?.message}
                    </p>
                  )}
                </div>

                <div className='w-32 space-y-2'>
                  <Label htmlFor={`items.${index}.quantity`}>Quantity *</Label>
                  <Input
                    id={`items.${index}.quantity`}
                    type='number'
                    min='1'
                    disabled={isSubmitting}
                    {...register(`items.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className='text-xs text-destructive'>
                      {errors.items[index]?.quantity?.message}
                    </p>
                  )}
                </div>

                <div className='flex items-end'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => removeItem(index)}
                    disabled={isSubmitting || fields.length === 1}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ))}

          {errors.items?.root && (
            <p className='text-sm text-destructive'>{errors.items.root.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className='flex justify-end gap-4'>
        <Button
          type='button'
          variant='outline'
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type='submit' disabled={isSubmitting || inventoryLoading}>
          {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          {isSubmitting ? 'Updating...' : 'Update Purchase Order'}
        </Button>
      </div>
    </form>
  )
}
