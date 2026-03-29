import { Search, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePOSProducts } from '@/hooks/use-pos-products'
import { type POSProduct } from '@/services/pos'

type ProductSelectorProps = {
  onSelectProduct: (product: POSProduct) => void
}

export function ProductSelector({ onSelectProduct }: ProductSelectorProps) {
  const { t } = useTranslation()
  const {
    filteredProducts,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    categories,
  } = usePOSProducts()

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='space-y-4 border-b pb-4'>
        {/* Search Input */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder={t('pos.sales.searchProducts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='h-12 pl-10 text-base'
            disabled={loading}
          />
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className='flex items-center gap-2'>
            <Filter className='size-4 text-muted-foreground' />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className='h-10'>
                <SelectValue placeholder={t('pos.sales.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? t('pos.sales.allCategories') : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent className='flex-1 overflow-hidden p-0'>
        <ScrollArea className='h-full'>
          <div className='space-y-2 p-4'>
            {loading && (
              <div className='py-8 text-center text-muted-foreground'>
                {t('pos.sales.loadingProducts')}
              </div>
            )}

            {error && (
              <div className='py-8 text-center text-destructive'>
                {t('common.error')}: {error}
              </div>
            )}

            {!loading && !error && filteredProducts.length === 0 && (
              <div className='py-8 text-center text-muted-foreground'>
                {t('pos.sales.noProductsFound')}
              </div>
            )}

            {!loading &&
              !error &&
              filteredProducts.map((product) => (
                <Button
                  key={product.id}
                  variant='outline'
                  className='h-auto w-full justify-start p-4 text-left'
                  onClick={() => onSelectProduct(product)}
                  disabled={product.stock === 0}
                >
                  <div className='flex w-full flex-col gap-2'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 space-y-1'>
                        <p className='font-semibold leading-none'>
                          {product.product_name}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          {product.size} • {product.color}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {product.category}
                        </p>
                      </div>
                      <div className='flex flex-col items-end gap-2'>
                        <p className='text-lg font-bold'>
                          ${product.price.toFixed(2)}
                        </p>
                        <Badge
                          variant={
                            product.stock === 0
                              ? 'destructive'
                              : product.stock < 5
                                ? 'outline'
                                : 'success'
                          }
                          className='text-xs'
                        >
                          {product.stock === 0
                            ? t('pos.sales.outOfStock')
                            : `${t('pos.sales.stock')}: ${product.stock}`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
