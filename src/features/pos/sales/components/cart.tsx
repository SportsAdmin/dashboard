import { Minus, Plus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { type CartItem } from '../types'

type CartProps = {
  items: CartItem[]
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
}

export function Cart({ items, onUpdateQuantity, onRemoveItem }: CartProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const tax = subtotal * 0.1 // 10% tax
  const total = subtotal + tax

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='border-b pb-4'>
        <CardTitle className='text-xl'>Cart ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col overflow-hidden p-0'>
        <ScrollArea className='flex-1'>
          <div className='space-y-3 p-4'>
            {items.length === 0 ? (
              <div className='py-12 text-center text-muted-foreground'>
                Cart is empty
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className='flex flex-col gap-3 rounded-lg border p-3'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 space-y-1'>
                      <p className='font-semibold leading-none'>
                        {item.productName}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {item.size} • {item.color}
                      </p>
                      <p className='text-sm font-medium'>
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 shrink-0 text-muted-foreground hover:text-destructive'
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <X className='size-4' />
                    </Button>
                  </div>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='icon'
                        className='size-9'
                        onClick={() =>
                          onUpdateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                      >
                        <Minus className='size-4' />
                      </Button>
                      <div className='w-12 text-center text-lg font-semibold'>
                        {item.quantity}
                      </div>
                      <Button
                        variant='outline'
                        size='icon'
                        className='size-9'
                        onClick={() =>
                          onUpdateQuantity(item.id, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className='size-4' />
                      </Button>
                    </div>
                    <div className='text-lg font-bold'>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className='border-t p-4'>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Subtotal</span>
              <span className='font-medium'>${subtotal.toFixed(2)}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Tax (10%)</span>
              <span className='font-medium'>${tax.toFixed(2)}</span>
            </div>
            <Separator className='my-2' />
            <div className='flex justify-between text-lg font-bold'>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
