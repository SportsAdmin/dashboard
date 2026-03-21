import { Banknote, CreditCard, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PaymentButtonsProps = {
  disabled: boolean
  onPayment: (method: 'cash' | 'card' | 'transfer') => void
}

export function PaymentButtons({
  disabled,
  onPayment,
}: PaymentButtonsProps) {
  return (
    <div className='grid grid-cols-3 gap-3'>
      <Button
        size='lg'
        className='h-16 flex-col gap-2'
        disabled={disabled}
        onClick={() => onPayment('cash')}
      >
        <Banknote className='size-6' />
        <span className='text-sm font-semibold'>Cash</span>
      </Button>
      <Button
        size='lg'
        className='h-16 flex-col gap-2'
        disabled={disabled}
        onClick={() => onPayment('transfer')}
      >
        <ArrowLeftRight className='size-6' />
        <span className='text-sm font-semibold'>Transfer</span>
      </Button>
      <Button
        size='lg'
        className='h-16 flex-col gap-2'
        disabled={disabled}
        onClick={() => onPayment('card')}
      >
        <CreditCard className='size-6' />
        <span className='text-sm font-semibold'>Card</span>
      </Button>
    </div>
  )
}
