import { useNavigate, useParams } from '@tanstack/react-router'
import type { PurchaseOrderStatus } from '@/config/permissions'
import { updatePurchaseOrder } from '@/services/purchaseOrders'
import type { UpdatePurchaseOrderPayload } from '@/types'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/use-permissions'
import { usePurchaseOrder } from '@/hooks/use-purchase-orders'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PurchaseOrderEditForm } from './components/purchase-order-edit-form'

export function EditPurchaseOrder() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams({ from: '/_authenticated/purchase-orders/$id' })
  const { purchaseOrder, loading, error } = usePurchaseOrder(id)
  const { canEditPO, loading: roleLoading } = usePermissions()
  const readOnly =
    !purchaseOrder || !canEditPO(purchaseOrder.status as PurchaseOrderStatus)

  const handleSubmit = async (data: UpdatePurchaseOrderPayload) => {
    const response = await updatePurchaseOrder(id, data)

    if (response.success) {
      toast.success(t('purchaseOrders.edit.orderUpdated'))
      navigate({ to: '/purchase-orders' })
      return true
    } else {
      toast.error(response.error || t('purchaseOrders.edit.orderUpdateFailed'))
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
              {readOnly && !loading
                ? t('purchaseOrders.view')
                : t('purchaseOrders.edit.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('purchaseOrders.edit.description')}
            </p>
          </div>
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

        {!loading && !roleLoading && !error && purchaseOrder && (
          <PurchaseOrderEditForm
            purchaseOrder={purchaseOrder}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            readOnly={readOnly}
          />
        )}
      </Main>
    </>
  )
}
