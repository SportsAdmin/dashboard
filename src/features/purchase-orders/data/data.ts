export const statusOptions = [
  {
    value: 'pending',
    label: 'Pending',
  },
  {
    value: 'approved',
    label: 'Approved',
  },
  {
    value: 'in_production',
    label: 'In Production',
  },
  {
    value: 'shipped',
    label: 'Shipped',
  },
  {
    value: 'delivered',
    label: 'Delivered',
  },
]

export const statusColors = {
  pending: 'warning',
  approved: 'info',
  in_production: 'default',
  shipped: 'secondary',
  delivered: 'success',
} as const
