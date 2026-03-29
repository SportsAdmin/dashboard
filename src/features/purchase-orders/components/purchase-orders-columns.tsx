import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'
import { Link } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import type { PurchaseOrderWithItems } from '@/types'
import {
  getStatusVariant,
  getStatusLabel,
  isOverdue,
  getProductPreviews,
  getTotalQuantity,
} from '../utils/formatters'

export const getPurchaseOrdersColumns = (t: any): ColumnDef<PurchaseOrderWithItems>[] => [
  {
    accessorKey: 'supplier',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('purchaseOrders.table.supplier')} />
    ),
    meta: {
      className: 'ps-1 max-w-0 w-1/5',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      return (
        <span className='truncate font-medium'>
          {row.getValue('supplier')}
        </span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('purchaseOrders.table.status')} />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const variant = getStatusVariant(status)
      const label = getStatusLabel(status)

      return <Badge variant={variant}>{label}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'expected_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('purchaseOrders.table.expectedDate')} />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const dateStr = row.getValue('expected_date') as string
      const overdue = isOverdue(row.original)

      try {
        const date = new Date(dateStr)
        return (
          <span className={overdue ? 'text-destructive font-medium' : ''}>
            {format(date, 'MMM dd, yyyy')}
          </span>
        )
      } catch {
        return <span>{dateStr}</span>
      }
    },
  },
  {
    id: 'products',
    header: t('purchaseOrders.table.products'),
    meta: {
      className: 'ps-1 max-w-0 w-1/4',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const { previews, hasMore, remaining } = getProductPreviews(row.original, 2)

      return (
        <div className='flex flex-col gap-1'>
          {previews.length === 0 ? (
            <span className='text-xs text-muted-foreground'>{t('purchaseOrders.table.noItems')}</span>
          ) : (
            <>
              {previews.map((preview, index) => (
                <span key={index} className='text-sm truncate'>
                  {preview}
                </span>
              ))}
              {hasMore && (
                <span className='text-xs text-muted-foreground'>
                  {t('purchaseOrders.table.moreItems', { count: remaining })}
                </span>
              )}
            </>
          )}
        </div>
      )
    },
  },
  {
    id: 'items_count',
    accessorFn: (row) => row.purchase_order_items?.length || 0,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('purchaseOrders.table.totalItems')} />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const totalQuantity = getTotalQuantity(row.original)

      return (
        <div className='flex items-center'>
          <Badge variant='outline' className='font-medium'>
            {t('purchaseOrders.table.units', { count: totalQuantity })}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('purchaseOrders.table.created')} />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const dateStr = row.getValue('created_at') as string
      try {
        const date = new Date(dateStr)
        return <span className='text-sm'>{format(date, 'MMM dd, yyyy')}</span>
      } catch {
        return <span className='text-sm'>{dateStr}</span>
      }
    },
  },
  {
    id: 'actions',
    header: t('purchaseOrders.table.actions'),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      return (
        <Link
          to='/purchase-orders/$id'
          params={{ id: row.original.id }}
        >
          <Button variant='ghost' size='sm'>
            <Pencil className='h-4 w-4' />
          </Button>
        </Link>
      )
    },
  },
]
