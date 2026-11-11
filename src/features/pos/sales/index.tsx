import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { type POSProduct } from '@/services/pos'
import { createSale } from '@/services/sales'
import { formatMoney, toCents } from '@/lib/utils'
import {
  SplitPaymentDialog,
  type PaymentLine,
} from './components/split-payment-dialog'
import { ProductSelector } from './components/product-selector'
import { Cart } from './components/cart'
import { PaymentButtons } from './components/payment-buttons'
import { type CartItem } from './types'

export function PosSales() {
  const { t } = useTranslation()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [splitOpen, setSplitOpen] = useState(false)

  const handleAddToCart = (product: POSProduct) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        // Increase quantity if already in cart
        if (existing.quantity >= existing.stock) {
          toast.error(t('pos.sales.stockLimitReached', { stock: existing.stock }))
          return prev
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      // Add new item to cart
      return [
        ...prev,
        {
          id: product.id,
          variant_id: product.variant_id,
          productName: product.product_name,
          size: product.size,
          color: product.color,
          price: product.price,
          quantity: 1,
          stock: product.stock,
        },
      ]
    })
  }

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.min(quantity, item.stock) } : item
      )
    )
  }

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  // Prices in the cart include taxes. This total is only for display: the DB
  // recomputes it from current prices and rejects payments that don't match.
  const total =
    cartItems.reduce((sum, item) => sum + toCents(item.price) * item.quantity, 0) / 100

  const submitSale = async (payments: PaymentLine[]) => {
    if (submitting || cartItems.length === 0) return

    setSubmitting(true)
    try {
      await createSale({
        items: cartItems.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        payments,
      })

      toast.success(
        t('pos.sales.split.saleRegistered', {
          total: formatMoney(total),
          methods: payments
            .map((p) =>
              payments.length > 1
                ? `${t(`pos.sales.payment.${p.method}`)} ${formatMoney(p.amount)}`
                : t(`pos.sales.payment.${p.method}`)
            )
            .join(' + '),
        })
      )
      setCartItems([])
      setSplitOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      // Stock changed (or was out of date): reload the product list either way
      setRefreshKey((key) => key + 1)
      setSubmitting(false)
    }
  }

  const handleClearCart = () => {
    setCartItems([])
    toast.success(t('pos.sales.cartCleared'))
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <h1 className='text-lg font-semibold'>{t('pos.sales.newSale')}</h1>
          {cartItems.length > 0 && (
            <Button variant='outline' size='sm' onClick={handleClearCart}>
              {t('pos.sales.clearCart')}
            </Button>
          )}
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitcher />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 p-4'>
        <div className='grid flex-1 gap-4 lg:grid-cols-2'>
          {/* Left side - Product Selector */}
          <div className='flex flex-col'>
            <ProductSelector
              onSelectProduct={handleAddToCart}
              refreshKey={refreshKey}
            />
          </div>

          {/* Right side - Cart */}
          <div className='flex flex-col gap-4'>
            <Cart
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
            <PaymentButtons
              disabled={cartItems.length === 0 || submitting}
              onPayment={(method) => submitSale([{ method, amount: total }])}
              onSplitPayment={() => setSplitOpen(true)}
            />
          </div>
        </div>
      </Main>

      <SplitPaymentDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        total={total}
        submitting={submitting}
        onConfirm={submitSale}
      />
    </>
  )
}
