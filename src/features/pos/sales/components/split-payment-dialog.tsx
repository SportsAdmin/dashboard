import { useState } from 'react'
import { type PaymentMethod } from '@/services/sales'
import { Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn, formatMoney, toCents } from '@/lib/utils'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'transfer',
  'card',
  'mercadopago',
]

type Line = { id: number; method: PaymentMethod; amount: string }

export type PaymentLine = { method: PaymentMethod; amount: number }

type SplitPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sale total. The DB recomputes it from current prices and rejects any mismatch. */
  total: number
  submitting: boolean
  onConfirm: (payments: PaymentLine[]) => void
}

let nextId = 0
const newLine = (method: PaymentMethod, amount = ''): Line => ({
  id: nextId++,
  method,
  amount,
})

const parseCents = (value: string) => {
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? toCents(n) : 0
}

export function SplitPaymentDialog({
  open,
  onOpenChange,
  total,
  submitting,
  onConfirm,
}: SplitPaymentDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !submitting && onOpenChange(value)}
    >
      <DialogContent className='sm:max-w-lg'>
        {/* Mounted only while open, so every opening starts from cash + transfer */}
        {open && (
          <SplitPaymentForm
            total={total}
            submitting={submitting}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SplitPaymentForm({
  total,
  submitting,
  onCancel,
  onConfirm,
}: Omit<SplitPaymentDialogProps, 'open' | 'onOpenChange'> & {
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [lines, setLines] = useState<Line[]>(() => [
    newLine('cash'),
    newLine('transfer'),
  ])

  const totalCents = toCents(total)
  const assignedCents = lines.reduce(
    (sum, line) => sum + parseCents(line.amount),
    0
  )
  const remainingCents = totalCents - assignedCents
  const allFilled =
    lines.length > 0 && lines.every((line) => parseCents(line.amount) > 0)
  const canConfirm = allFilled && remainingCents === 0 && !submitting

  const update = (id: number, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line))
    )

  const fillRemaining = (line: Line) => {
    const cents = parseCents(line.amount) + remainingCents
    if (cents > 0) update(line.id, { amount: (cents / 100).toFixed(2) })
  }

  const unusedMethod = () =>
    PAYMENT_METHODS.find((m) => !lines.some((line) => line.method === m)) ??
    'cash'

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(
      lines.map((line) => ({
        method: line.method,
        amount: parseCents(line.amount) / 100,
      }))
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('pos.sales.split.title')}</DialogTitle>
        <DialogDescription>
          {t('pos.sales.split.description')}
        </DialogDescription>
      </DialogHeader>

      <div className='flex items-baseline justify-between rounded-md bg-muted px-4 py-3'>
        <span className='text-sm text-muted-foreground'>
          {t('pos.sales.split.totalToPay')}
        </span>
        <span className='text-2xl font-bold'>{formatMoney(total)}</span>
      </div>

      <div className='space-y-3'>
        {lines.map((line) => (
          <div key={line.id} className='flex items-center gap-2'>
            <Select
              value={line.method}
              onValueChange={(value) =>
                update(line.id, { method: value as PaymentMethod })
              }
            >
              <SelectTrigger
                className='w-40'
                aria-label={t('pos.sales.split.method')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`pos.sales.payment.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              inputMode='decimal'
              placeholder='0.00'
              aria-label={t('pos.sales.split.amount')}
              value={line.amount}
              onChange={(e) => update(line.id, { amount: e.target.value })}
              onFocus={() => {
                if (!line.amount && remainingCents > 0) fillRemaining(line)
              }}
              className='flex-1 text-right'
            />
            <Button
              variant='ghost'
              size='icon'
              aria-label={t('pos.sales.split.removePayment')}
              disabled={lines.length <= 1}
              onClick={() =>
                setLines((prev) => prev.filter((l) => l.id !== line.id))
              }
            >
              <X className='size-4' />
            </Button>
          </div>
        ))}

        <Button
          variant='outline'
          size='sm'
          disabled={lines.length >= PAYMENT_METHODS.length}
          onClick={() => setLines((prev) => [...prev, newLine(unusedMethod())])}
        >
          <Plus className='mr-1 size-4' />
          {t('pos.sales.split.addPayment')}
        </Button>
      </div>

      <div className='space-y-1 border-t pt-3 text-sm'>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>
            {t('pos.sales.split.assigned')}
          </span>
          <span>{formatMoney(assignedCents / 100)}</span>
        </div>
        <div
          className={cn(
            'flex justify-between font-semibold',
            remainingCents === 0
              ? 'text-green-600 dark:text-green-500'
              : 'text-destructive'
          )}
        >
          <span>
            {remainingCents >= 0
              ? t('pos.sales.split.remaining')
              : t('pos.sales.split.exceeds')}
          </span>
          <span>{formatMoney(Math.abs(remainingCents) / 100)}</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant='outline' disabled={submitting} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button disabled={!canConfirm} onClick={handleConfirm}>
          {t('pos.sales.split.confirm')}
        </Button>
      </DialogFooter>
    </>
  )
}
