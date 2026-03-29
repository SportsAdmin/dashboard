import { Banknote, CreditCard, ArrowLeftRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type PaymentButtonsProps = {
  disabled: boolean
  onPayment: (method: 'cash' | 'card' | 'transfer') => void
}

export function PaymentButtons({
  disabled,
  onPayment,
}: PaymentButtonsProps) {
  const { t } = useTranslation()
  return (
    <div className='grid grid-cols-3 gap-3'>
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
    </div>
  )
}
