import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  createReturn,
  getReturnableSales,
  saleRef,
  type ReturnCondition,
  type ReturnableSale,
} from '@/services/returns'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/utils'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Line = { quantity: number; condition: ReturnCondition }

type NewReturnDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function NewReturnDialog({
  open,
  onOpenChange,
  onCreated,
}: NewReturnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        {/* Mounted only while open, so every opening starts with a clean form */}
        {open && (
          <NewReturnForm
            onClose={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NewReturnForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const [sales, setSales] = useState<ReturnableSale[]>([])
  const [loading, setLoading] = useState(true)
  const [saleId, setSaleId] = useState<string>('')
  const [lines, setLines] = useState<Record<string, Line>>({})
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getReturnableSales()
      .then(setSales)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [])

  const sale = useMemo(
    () => sales.find((s) => s.id === saleId),
    [sales, saleId]
  )

  const selectSale = (id: string) => {
    setSaleId(id)
    const selected = sales.find((s) => s.id === id)
    setLines(
      Object.fromEntries(
        (selected?.items ?? []).map((item) => [
          item.variant_id,
          { quantity: 0, condition: 'new' as ReturnCondition },
        ])
      )
    )
  }

  const updateLine = (variantId: string, patch: Partial<Line>) =>
    setLines((prev) => ({
      ...prev,
      [variantId]: { ...prev[variantId], ...patch },
    }))

  const selectedItems = Object.entries(lines)
    .filter(([, line]) => line.quantity > 0)
    .map(([variant_id, line]) => ({ variant_id, ...line }))

  const handleSubmit = async () => {
    if (!sale || selectedItems.length === 0) return
    setSubmitting(true)
    try {
      await createReturn(sale.id, selectedItems, reason.trim())
      toast.success(t('returns.created'))
      onClose()
      onCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('returns.newReturn')}</DialogTitle>
        <DialogDescription>
          {t('returns.newReturnDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label>{t('returns.form.sale')}</Label>
          <Select value={saleId} onValueChange={selectSale} disabled={loading}>
            <SelectTrigger className='w-full'>
              <SelectValue
                placeholder={
                  loading
                    ? t('returns.form.loadingSales')
                    : sales.length === 0
                      ? t('returns.form.noSales')
                      : t('returns.form.selectSale')
                }
              />
            </SelectTrigger>
            <SelectContent>
              {sales.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {saleRef(s.id)} ·{' '}
                  {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm')} ·{' '}
                  {formatMoney(s.total)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {sale && (
          <div className='space-y-3'>
            <Label>{t('returns.form.items')}</Label>
            {sale.items.map((item) => {
              const line = lines[item.variant_id]
              const disabled = item.available === 0
              return (
                <div
                  key={item.variant_id}
                  className='grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_6rem_9rem] sm:items-center'
                >
                  <div>
                    <div className='font-medium'>{item.label}</div>
                    <div className='text-xs text-muted-foreground'>
                      {t('returns.form.soldReturned', {
                        sold: item.sold,
                        returned: item.returned,
                        available: item.available,
                      })}
                    </div>
                  </div>
                  <Input
                    type='number'
                    min={0}
                    max={item.available}
                    disabled={disabled}
                    aria-label={t('returns.form.quantity')}
                    value={line?.quantity ?? 0}
                    onChange={(e) => {
                      const value = Math.trunc(Number(e.target.value) || 0)
                      updateLine(item.variant_id, {
                        quantity: Math.min(Math.max(value, 0), item.available),
                      })
                    }}
                  />
                  <Select
                    value={line?.condition ?? 'new'}
                    disabled={disabled}
                    onValueChange={(value) =>
                      updateLine(item.variant_id, {
                        condition: value as ReturnCondition,
                      })
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['new', 'used', 'damaged'] as const).map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`returns.condition.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
            <p className='text-xs text-muted-foreground'>
              {t('returns.form.damagedHint')}
            </p>
          </div>
        )}

        {sale && (
          <div className='space-y-2'>
            <Label htmlFor='return-reason'>{t('returns.form.reason')}</Label>
            <Textarea
              id='return-reason'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('returns.form.reasonPlaceholder')}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant='outline' onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!sale || selectedItems.length === 0 || submitting}
        >
          {t('returns.form.submit')}
        </Button>
      </DialogFooter>
    </>
  )
}
