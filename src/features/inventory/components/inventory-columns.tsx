import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { type InventoryItem } from '../data/schema'

export const inventoryColumns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: 'productName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Product Name' />
    ),
    meta: {
      className: 'ps-1 max-w-0 w-1/4',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      return (
        <span className='truncate font-medium'>
          {row.getValue('productName')}
        </span>
      )
    },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      return (
        <span className='text-sm text-muted-foreground'>
          {row.getValue('category')}
        </span>
      )
    },
  },
  {
    accessorKey: 'variant',
    header: 'Variant',
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const size = row.original.size
      const color = row.original.color
      return (
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>{size}</span>
          <span className='text-muted-foreground'>•</span>
          <span className='text-sm text-muted-foreground'>{color}</span>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Stock' />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const stock = row.getValue('stock') as number
      const variant = stock < 5 ? 'destructive' : 'success'

      return (
        <Badge variant={variant} className='font-medium'>
          {stock}
        </Badge>
      )
    },
    filterFn: (row, _id, value) => {
      const stock = row.getValue('stock') as number
      // value is an array of selected stock statuses
      if (value.includes('low-stock') && stock > 0 && stock < 5) return true
      if (value.includes('out-of-stock') && stock === 0) return true
      if (value.includes('in-stock') && stock >= 5) return true
      return false
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Price' />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const price = row.getValue('price') as number
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price)

      return <span className='font-medium'>{formatted}</span>
    },
  },
]
