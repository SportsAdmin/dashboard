import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { ProductsTable } from './components/products-table'
import { ProductFormDialog } from './components/product-form-dialog'
import { type ProductFormData } from './data/schema'
import { useProducts } from '@/hooks/use-products'

export function Products() {
  const { t } = useTranslation()
  const { products: productsList, loading, error, createProduct } = useProducts()
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreateProduct = async (
    data: ProductFormData
  ): Promise<boolean> => {
    try {
      const response = await createProduct({
        product: {
          name: data.name,
          category: data.category,
          description: data.description,
        },
        variants: data.variants.map((v) => ({
          size_id: v.size_id,
          color: v.color,
          price: v.price,
          price_sale: v.price_sale || null,
        })),
      })

      if (response.success) {
        toast.success(`${data.name} has been created successfully`, {
          description: `Added with ${data.variants.length} variant(s)`,
        })
        setDialogOpen(false)
        return true
      } else {
        toast.error('Failed to create product', {
          description: response.error || 'Please try again',
        })
        return false
      }
    } catch (err) {
      toast.error('An unexpected error occurred', {
        description: err instanceof Error ? err.message : 'Please try again',
      })
      return false
    }
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitcher />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('products.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('products.description')}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className='mr-2 size-4' />
            {t('products.createProduct')}
          </Button>
        </div>

        {loading && (
          <div className='flex items-center justify-center py-8'>
            <p className='text-muted-foreground'>{t('common.loading')}</p>
          </div>
        )}

        {error && (
          <div className='flex items-center justify-center py-8'>
            <p className='text-destructive'>
              {t('common.error')}: {error}
            </p>
          </div>
        )}

        {!loading && !error && <ProductsTable data={productsList} />}
      </Main>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateProduct}
      />
    </>
  )
}
