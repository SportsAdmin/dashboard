import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { inventory } from '@/features/inventory/data/inventory'
import { type InventoryItem } from '@/features/inventory/data/schema'

type ProductSelectorProps = {
  onSelectProduct: (item: InventoryItem) => void
}

export function ProductSelector({ onSelectProduct }: ProductSelectorProps) {
  const [search, setSearch] = useState('')

  const filteredProducts = inventory.filter((item) => {
    const searchLower = search.toLowerCase()
    return (
      item.productName.toLowerCase().includes(searchLower) ||
      item.size.toLowerCase().includes(searchLower) ||
      item.color.toLowerCase().includes(searchLower)
    )
  })

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='border-b pb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search products...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='h-12 pl-10 text-base'
          />
        </div>
      </CardHeader>
      <CardContent className='flex-1 overflow-hidden p-0'>
        <ScrollArea className='h-full'>
          <div className='space-y-2 p-4'>
            {filteredProducts.map((item) => (
              <Button
                key={item.id}
                variant='outline'
                className='h-auto w-full justify-start p-4 text-left'
                onClick={() => onSelectProduct(item)}
                disabled={item.stock === 0}
              >
                <div className='flex w-full flex-col gap-2'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 space-y-1'>
                      <p className='font-semibold leading-none'>
                        {item.productName}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {item.size} • {item.color}
                      </p>
                    </div>
                    <div className='flex flex-col items-end gap-2'>
                      <p className='text-lg font-bold'>
                        ${item.price.toFixed(2)}
                      </p>
                      <Badge
                        variant={
                          item.stock === 0
                            ? 'destructive'
                            : item.stock < 5
                              ? 'secondary'
                              : 'success'
                        }
                        className='text-xs'
                      >
                        {item.stock === 0
                          ? 'Out of Stock'
                          : `Stock: ${item.stock}`}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Button>
            ))}
            {filteredProducts.length === 0 && (
              <div className='py-8 text-center text-muted-foreground'>
                No products found
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
