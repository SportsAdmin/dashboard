# Ejemplos de uso de tipos centralizados

Este archivo contiene ejemplos prácticos de cómo usar los tipos centralizados en diferentes partes de la aplicación.

## 1. Servicios

### Ejemplo: Servicio de productos

```typescript
import { supabase } from '@/lib/supabase'
import type {
  ProductWithVariants,
  CreateProductPayload,
  ProductsResponse,
  CreateProductResponse,
} from '@/types'

export async function getProducts(): Promise<ProductsResponse> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, variants:product_variants(*)')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      products: data as ProductWithVariants[],
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function createProduct(
  payload: CreateProductPayload
): Promise<CreateProductResponse> {
  // Implementation...
}
```

## 2. Hooks

### Ejemplo: Hook de productos

```typescript
import { useQuery } from '@tanstack/react-query'
import { getProducts } from '@/services/products'
import type { ProductWithVariants } from '@/types'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await getProducts()
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.products || []
    },
  })
}

// Usando el hook en un componente
function ProductList() {
  const { data: products, isLoading, error } = useProducts()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {products?.map((product: ProductWithVariants) => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}
```

## 3. Componentes

### Ejemplo: Componente con props tipados

```typescript
import type { Sale, SaleWithItems } from '@/types'

interface SalesTableProps {
  sales: SaleWithItems[]
  onSelectSale: (sale: Sale) => void
  isLoading?: boolean
}

export function SalesTable({ sales, onSelectSale, isLoading }: SalesTableProps) {
  if (isLoading) return <Skeleton />

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Cliente</th>
          <th>Total</th>
          <th>Método de pago</th>
        </tr>
      </thead>
      <tbody>
        {sales.map((sale) => (
          <tr key={sale.id} onClick={() => onSelectSale(sale)}>
            <td>{sale.id}</td>
            <td>{sale.customer_name || 'N/A'}</td>
            <td>${sale.total}</td>
            <td>{sale.payment_method}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## 4. Forms

### Ejemplo: Formulario con tipos de payload

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CreateProductPayload, ProductVariantInput } from '@/types'

// Schema de validación basado en el tipo
const productFormSchema = z.object({
  product: z.object({
    name: z.string().min(1, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    description: z.string(),
  }),
  variants: z.array(
    z.object({
      size_id: z.string(),
      color: z.string(),
      price: z.number().positive(),
      price_sale: z.number().positive().optional().nullable(),
    })
  ),
})

type ProductFormData = z.infer<typeof productFormSchema>

export function CreateProductForm() {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
  })

  const onSubmit = async (data: ProductFormData) => {
    // data ya es del tipo CreateProductPayload
    const payload: CreateProductPayload = data
    const response = await createProduct(payload)

    if (response.success) {
      console.log('Product created:', response.productId)
    } else {
      console.error('Error:', response.error)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

## 5. Estado global (Zustand)

### Ejemplo: Store con tipos

```typescript
import { create } from 'zustand'
import type { CartItem, Sale } from '@/types'

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => set((state) => ({
    items: [...state.items, item],
  })),

  removeItem: (itemId) => set((state) => ({
    items: state.items.filter((i) => i.id !== itemId),
  })),

  updateQuantity: (itemId, quantity) => set((state) => ({
    items: state.items.map((i) =>
      i.id === itemId ? { ...i, quantity } : i
    ),
  })),

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    const items = get().items
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  },
}))
```

## 6. Constantes y Enums

### Ejemplo: Uso de constantes tipadas

```typescript
import { PURCHASE_ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types'
import type { PurchaseOrderStatus, PaymentMethod } from '@/types'

// En un select/dropdown
function StatusSelect({ value, onChange }: {
  value: PurchaseOrderStatus
  onChange: (value: PurchaseOrderStatus) => void
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PurchaseOrderStatus)}>
      {Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  )
}

// En un badge/chip
function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <span className="badge">
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  )
}
```

## 7. Tipos de utilidad

### Ejemplo: Partial updates

```typescript
import type { Profile, ProfileUpdate } from '@/types'

// Para actualizaciones parciales, usa el tipo Update de database.types
async function updateUserProfile(
  userId: string,
  updates: ProfileUpdate
) {
  const response = await updateProfile(userId, updates)
  return response
}

// Llamada con actualización parcial
updateUserProfile('user-123', {
  name: 'New Name',
  // Otros campos son opcionales
})
```

## 8. Response handling

### Ejemplo: Manejo de respuestas tipadas

```typescript
import type { ProductsResponse } from '@/types'

async function fetchAndDisplayProducts() {
  const response: ProductsResponse = await getProducts()

  if (!response.success) {
    // TypeScript sabe que 'error' puede existir aquí
    console.error('Failed to fetch products:', response.error)
    return
  }

  // TypeScript sabe que 'products' puede existir aquí
  if (response.products) {
    console.log('Products loaded:', response.products.length)
    response.products.forEach((product) => {
      console.log(`- ${product.name} (${product.variants.length} variants)`)
    })
  }
}
```

## Ventajas de usar tipos centralizados

1. **Consistencia**: Todos usan los mismos tipos
2. **Autocompletado**: Mejor experiencia de desarrollo con IntelliSense
3. **Refactoring seguro**: Cambios en un solo lugar
4. **Documentación**: Los tipos sirven como documentación viva
5. **Menos errores**: TypeScript detecta inconsistencias en tiempo de desarrollo
