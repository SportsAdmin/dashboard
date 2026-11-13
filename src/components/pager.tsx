import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PagerProps = {
  page: number
  pageCount: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizes?: number[]
  disabled?: boolean
}

/** Server-side pagination controls: every change asks the backend for that page. */
export function Pager({
  page,
  pageCount,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50, 100],
  disabled,
}: PagerProps) {
  const { t } = useTranslation()
  const first = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalCount)

  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <p className='text-sm text-muted-foreground tabular-nums'>
        {t('pager.showing', { first, last, total: totalCount })}
      </p>
      <div className='flex flex-wrap items-center gap-4'>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>
            {t('pager.rowsPerPage')}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger
              className='h-8 w-[72px]'
              aria-label={t('pager.rowsPerPage')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className='text-sm tabular-nums'>
          {t('pager.pageOf', { page, pageCount })}
        </span>
        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label={t('pager.first')}
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label={t('pager.previous')}
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label={t('pager.next')}
            disabled={disabled || page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label={t('pager.last')}
            disabled={disabled || page >= pageCount}
            onClick={() => onPageChange(pageCount)}
          >
            <ChevronsRight className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
