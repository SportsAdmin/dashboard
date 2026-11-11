import { useState } from 'react'
import { format } from 'date-fns'
import {
  deleteReturn,
  saleRef,
  variantLabel,
  type ReturnCondition,
  type ReturnRecord,
} from '@/services/returns'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'

const conditionVariant: Record<
  ReturnCondition,
  'default' | 'secondary' | 'destructive'
> = {
  new: 'default',
  used: 'secondary',
  damaged: 'destructive',
}

type ReturnsTableProps = {
  data: ReturnRecord[]
  /** Admin / manager. Sellers never see the delete action (the DB rejects it too). */
  canDelete: boolean
  onChanged: () => void
}

export function ReturnsTable({
  data,
  canDelete,
  onChanged,
}: ReturnsTableProps) {
  const { t } = useTranslation()
  const [toDelete, setToDelete] = useState<ReturnRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteReturn(toDelete.id)
      toast.success(t('returns.deleted'))
      setToDelete(null)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('returns.table.date')}</TableHead>
              <TableHead>{t('returns.table.sale')}</TableHead>
              <TableHead>{t('returns.table.items')}</TableHead>
              <TableHead>{t('returns.table.reason')}</TableHead>
              <TableHead>{t('returns.table.createdBy')}</TableHead>
              {canDelete && <TableHead className='w-12' />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((ret) => (
              <TableRow key={ret.id}>
                <TableCell className='whitespace-nowrap'>
                  {format(new Date(ret.created_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell className='whitespace-nowrap'>
                  <div className='font-mono text-sm'>
                    {saleRef(ret.sale_id)}
                  </div>
                  {ret.sales && (
                    <div className='text-xs text-muted-foreground'>
                      {format(new Date(ret.sales.created_at), 'dd/MM/yyyy')}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <ul className='space-y-1'>
                    {ret.return_items.map((item) => (
                      <li
                        key={item.id}
                        className='flex flex-wrap items-center gap-2'
                      >
                        <span>
                          {item.quantity} ×{' '}
                          {variantLabel(item.product_variants)}
                        </span>
                        <Badge variant={conditionVariant[item.condition]}>
                          {t(`returns.condition.${item.condition}`)}
                        </Badge>
                        {!item.restocked && (
                          <span className='text-xs text-muted-foreground'>
                            {t('returns.notRestocked')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className='max-w-64 text-muted-foreground'>
                  {ret.reason || '—'}
                </TableCell>
                <TableCell>{ret.creator?.name ?? '—'}</TableCell>
                {canDelete && (
                  <TableCell>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={t('returns.delete')}
                      onClick={() => setToDelete(ret)}
                    >
                      <Trash2 className='size-4 text-destructive' />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('returns.deleteTitle')}
        desc={t('returns.deleteDescription')}
        confirmText={t('returns.delete')}
        destructive
        isLoading={deleting}
        disabled={deleting}
        handleConfirm={handleDelete}
      />
    </>
  )
}
