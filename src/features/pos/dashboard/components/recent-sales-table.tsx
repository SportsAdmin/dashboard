import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Sale = {
  id: string
  date: string
  customer: string
  total: number
  paymentMethod: string
}

// Mock data
const recentSales: Sale[] = [
  {
    id: '1',
    date: '2026-03-19 14:32',
    customer: 'John Smith',
    total: 145.50,
    paymentMethod: 'Credit Card',
  },
  {
    id: '2',
    date: '2026-03-19 13:15',
    customer: 'Maria Garcia',
    total: 89.99,
    paymentMethod: 'Cash',
  },
  {
    id: '3',
    date: '2026-03-19 12:47',
    customer: 'Robert Johnson',
    total: 234.75,
    paymentMethod: 'Debit Card',
  },
  {
    id: '4',
    date: '2026-03-19 11:23',
    customer: 'Sarah Williams',
    total: 67.20,
    paymentMethod: 'Credit Card',
  },
  {
    id: '5',
    date: '2026-03-19 10:55',
    customer: 'Michael Brown',
    total: 312.40,
    paymentMethod: 'Credit Card',
  },
  {
    id: '6',
    date: '2026-03-19 10:12',
    customer: 'Lisa Anderson',
    total: 156.80,
    paymentMethod: 'Cash',
  },
  {
    id: '7',
    date: '2026-03-19 09:38',
    customer: 'David Martinez',
    total: 92.50,
    paymentMethod: 'Debit Card',
  },
  {
    id: '8',
    date: '2026-03-19 09:05',
    customer: 'Jennifer Taylor',
    total: 178.30,
    paymentMethod: 'Credit Card',
  },
]

export function RecentSalesTable() {
  const { t } = useTranslation()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('pos.table.date')}</TableHead>
          <TableHead>{t('pos.table.customer')}</TableHead>
          <TableHead>{t('pos.table.total')}</TableHead>
          <TableHead>{t('pos.table.paymentMethod')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recentSales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className='font-medium'>{sale.date}</TableCell>
            <TableCell>{sale.customer}</TableCell>
            <TableCell>${sale.total.toFixed(2)}</TableCell>
            <TableCell>{sale.paymentMethod}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
