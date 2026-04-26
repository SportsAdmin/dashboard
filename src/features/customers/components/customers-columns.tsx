import { type ColumnDef } from '@tanstack/react-table'
import i18n from '@/lib/i18n'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Customer } from '../data/schema'

export const customersColumns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t('customers.table.name')} />
    ),
    meta: {
      className: 'ps-1 max-w-0 w-2/5',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      return (
        <span className='truncate font-medium'>{row.getValue('name')}</span>
      )
    },
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t('customers.table.phone')} />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      return (
        <span className='text-sm text-muted-foreground'>
          {row.getValue('phone')}
        </span>
      )
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t('customers.table.email')} />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      return (
        <span className='text-sm text-muted-foreground'>
          {row.getValue('email')}
        </span>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t('customers.table.joined')} />
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
