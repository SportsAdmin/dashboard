import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Product } from '../data/schema'

export const productsColumns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Product Name' />
    ),
    meta: {
      className: 'ps-1 max-w-0 w-2/5',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      return (
        <div className='space-y-1'>
          <p className='truncate font-medium'>{row.getValue('name')}</p>
          <p className='text-sm text-muted-foreground'>
            {row.original.category}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: 'variants',
    id: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Price' />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const variants = row.original.variants
      if (variants.length === 0) return <span>-</span>

      // Get prices and sale prices
      const prices = variants.map((v) => v.price)
      const salePrices = variants
        .map((v) => v.price_sale)
        .filter((p): p is number => p !== null && p !== undefined)

      const minPrice = Math.min(...prices)
      const minSalePrice = salePrices.length > 0 ? Math.min(...salePrices) : null

      const formatPrice = (price: number) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(price)

      // If there are sale prices, show sale price and original crossed out
      if (minSalePrice !== null) {
        return (
          <div className='flex flex-col'>
            <span className='font-medium text-destructive'>
              {formatPrice(minSalePrice)}
            </span>
            <span className='text-xs text-muted-foreground line-through'>
              {formatPrice(minPrice)}
            </span>
          </div>
        )
      }

      // Otherwise show regular price
      return <span className='font-medium'>{formatPrice(minPrice)}</span>
    },
  },
  {
    accessorKey: 'variants',
    header: 'Variants',
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const variantsCount = row.original.variants.length
      const totalStock = row.original.variants.reduce(
        (sum, v) => sum + v.stock,
        0
      )

      return (
        <div className='flex items-center gap-2'>
          <Badge variant='outline'>{variantsCount} variant(s)</Badge>
          <span className='text-sm text-muted-foreground'>
            Stock: {totalStock}
          </span>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'))
      return (
        <span className='text-sm text-muted-foreground'>
          {date.toLocaleDateString()}
        </span>
      )
    },
  },
]
