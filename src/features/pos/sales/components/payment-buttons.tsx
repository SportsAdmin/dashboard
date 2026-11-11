import { Banknote, CreditCard, ArrowLeftRight, Split } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type PaymentButtonsProps = {
  disabled: boolean
  /** Pay the whole total with a single method */
  onPayment: (method: 'cash' | 'card' | 'transfer') => void
  /** Open the split payment dialog (e.g. part cash, part transfer) */
  onSplitPayment: () => void
}

export function PaymentButtons({
  disabled,
  onPayment,
  onSplitPayment,
}: PaymentButtonsProps) {
  const { t } = useTranslation()
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
      <Button
        size='lg'
        className='h-16 flex-col gap-2'
        disabled={disabled}
        onClick={() => onPayment('cash')}
      >
        <Banknote className='size-6' />
        <span className='text-sm font-semibold'>{t('pos.sales.payment.cash')}</span>
      </Button>
      <Button
        size='lg'
        className='h-16 flex-col gap-2'
        disabled={disabled}
        onClick={() => onPayment('transfer')}
      >
        <ArrowLeftRight className='size-6' />
        <span className='text-sm font-semibold'>{t('pos.sales.payment.transfer')}</span>
      </Button>
      <Button
        size='lg'
        className='h-16 flex-col gap-2'
        disabled={disabled}
        onClick={() => onPayment('card')}
      >
        <CreditCard className='size-6' />
        <span className='text-sm font-semibold'>{t('pos.sales.payment.card')}</span>
      </Button>
      <Button
        size='lg'
        variant='outline'
        className='h-16 flex-col gap-2'
        disabled={disabled}
        onClick={onSplitPayment}
      >
        <Split className='size-6' />
        <span className='text-sm font-semibold'>{t('pos.sales.split.splitPayment')}</span>
      </Button>
    </div>
  )
}
