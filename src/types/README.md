# Types Directory

Esta carpeta contiene todos los tipos e interfaces TypeScript centralizados de la aplicación.

## Estructura

```
src/types/
├── index.ts              # Punto de entrada centralizado para todas las exportaciones
├── profile.ts            # Tipos relacionados con perfiles de usuario
├── club.ts               # Tipos relacionados con clubes
├── product.ts            # Tipos relacionados con productos y variantes
├── inventory.ts          # Tipos relacionados con inventario
├── purchase-order.ts     # Tipos relacionados con órdenes de compra
├── sale.ts               # Tipos relacionados con ventas y POS
├── customer.ts           # Tipos relacionados con clientes
└── README.md            # Este archivo
```

## Uso

### Importación desde otros archivos

Importa los tipos desde el punto de entrada centralizado:

```typescript
import { Profile, Club, Product, Sale } from '@/types'
```

O importa desde archivos específicos:

```typescript
import { Profile, ProfileResponse } from '@/types/profile'
import { CreateClubPayload } from '@/types/club'
```

### Categorías de tipos

Cada archivo contiene las siguientes categorías:

#### 1. Database Types
Tipos extraídos directamente de `database.types.ts`:
```typescript
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
```

#### 2. Extended Types
Tipos que incluyen relaciones y datos anidados:
```typescript
export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
}
```

#### 3. Service Input Types
Tipos para payloads de entrada a servicios:
```typescript
export interface CreateProductPayload {
  product: {
    name: string
    category: string
  }
  variants: ProductVariantInput[]
}
```

#### 4. Service Response Types
Tipos para respuestas de servicios:
```typescript
export interface ProductResponse {
  success: boolean
  error?: string
  product?: Product
}
```

## Convenciones

1. **Nomenclatura de archivos**: kebab-case (ej: `purchase-order.ts`)
2. **Nomenclatura de tipos**: PascalCase (ej: `ProductWithVariants`)
3. **Sufijos comunes**:
   - `*Response`: Para respuestas de servicios
   - `*Payload`: Para datos de entrada
   - `*Input`: Para objetos de entrada simples
   - `*WithDetails`: Para tipos con relaciones anidadas

## Migración de tipos existentes

Si encuentras tipos definidos en otros archivos (services, hooks, etc.), considera migrarlos aquí:

1. Identifica el tipo y su dominio
2. Muévelo al archivo correspondiente en `src/types/`
3. Actualiza las importaciones en los archivos que lo usan
4. Asegúrate de exportar el tipo desde `index.ts`

## Ejemplos de uso

### En servicios:
```typescript
import { CreateProductPayload, ProductResponse } from '@/types'

export async function createProduct(payload: CreateProductPayload): Promise<ProductResponse> {
  // implementation
}
```

### En hooks:
```typescript
import { Product, ProductWithVariants } from '@/types'

export function useProducts() {
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  // implementation
}
```

### En componentes:
```typescript
import { Sale, CartItem } from '@/types'

interface SalesTableProps {
  sales: Sale[]
  onSelect: (sale: Sale) => void
}
```
