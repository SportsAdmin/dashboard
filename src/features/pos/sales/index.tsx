import { useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { type InventoryItem } from '@/features/inventory/data/schema'
import { ProductSelector } from './components/product-selector'
import { Cart } from './components/cart'
import { PaymentButtons } from './components/payment-buttons'
import { type CartItem } from './types'

export function PosSales() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const handleAddToCart = (product: InventoryItem) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        // Increase quantity if already in cart
        if (existing.quantity >= existing.stock) {
          toast.error(`Stock limit reached. Only ${existing.stock} available`)
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
          productName: product.productName,
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

  const handlePayment = (method: 'cash' | 'card' | 'transfer') => {
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    const totalWithTax = total * 1.1

    toast.success(
      `${method.charAt(0).toUpperCase() + method.slice(1)} payment of $${totalWithTax.toFixed(2)} completed`
    )

    // Clear cart after successful payment
    setCartItems([])
  }

  const handleClearCart = () => {
    setCartItems([])
    toast.success('Cart cleared')
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <h1 className='text-lg font-semibold'>New Sale</h1>
          {cartItems.length > 0 && (
            <Button variant='outline' size='sm' onClick={handleClearCart}>
              Clear Cart
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
            <ProductSelector onSelectProduct={handleAddToCart} />
          </div>

          {/* Right side - Cart */}
          <div className='flex flex-col gap-4'>
            <Cart
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
            <PaymentButtons
              disabled={cartItems.length === 0}
              onPayment={handlePayment}
            />
          </div>
        </div>
      </Main>
    </>
  )
}
