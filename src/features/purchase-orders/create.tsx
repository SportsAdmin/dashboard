import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { PurchaseOrderForm } from './components/purchase-order-form'
import { usePurchaseOrders } from '@/hooks/use-purchase-orders'
import { type CreatePurchaseOrderPayload } from '@/services/purchaseOrders'

export function CreatePurchaseOrder() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { createOrder } = usePurchaseOrders()

  const handleSubmit = async (data: CreatePurchaseOrderPayload) => {
    const response = await createOrder(data)

    if (response.success) {
      toast.success(t('purchaseOrders.form.orderCreated'))
      navigate({ to: '/purchase-orders' })
      return true
    } else {
      toast.error(response.error || t('purchaseOrders.form.orderCreateFailed'))
      return false
    }
  }

  const handleCancel = () => {
    navigate({ to: '/purchase-orders' })
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
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate({ to: '/purchase-orders' })}
          >
            <ArrowLeft className='h-5 w-5' />
          </Button>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('purchaseOrders.create.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('purchaseOrders.create.description')}
            </p>
          </div>
        </div>

        <PurchaseOrderForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </Main>
    </>
  )
}
