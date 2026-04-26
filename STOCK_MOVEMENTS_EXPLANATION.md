# Explicación de Stock Movements

## 📊 ¿Cuándo se Generan los Registros en `stock_movements`?

La tabla `stock_movements` registra TODOS los cambios en el inventario. Se generan automáticamente en estos 4 casos:

### 1. **VENTA** (`type: 'sale'`)
**Cuándo:** Al insertar un item en la tabla `sale_items`
**Trigger:** `register_stock_movement` AFTER INSERT ON `sale_items`
**Función:** `create_stock_movement()`
**Cantidad:** Negativa (se resta del stock)

```sql
-- Se ejecuta automáticamente cuando:
INSERT INTO sale_items (sale_id, variant_id, quantity, ...) VALUES ...

-- Crea registro en stock_movements:
{
  type: 'sale',
  quantity: -X,  -- negativo porque se vendió
  reference_id: sale_id,
  variant_id: ...
}
```

---

### 2. **REABASTECIMIENTO** (`type: 'restock'`)
**Cuándo:** Al marcar una purchase order como "delivered"
**Trigger:** `on_purchase_order_updated` AFTER UPDATE ON `purchase_orders`
**Función:** `handle_purchase_order_delivered()`
**Cantidad:** Positiva (se suma al stock)

```sql
-- Se ejecuta automáticamente cuando:
UPDATE purchase_orders SET status = 'delivered' WHERE id = ...

-- Crea múltiples registros (uno por cada item):
{
  type: 'restock',
  quantity: +X,  -- positivo porque se recibió mercancía
  reference_id: purchase_order_id,
  variant_id: ...
}
```

---

### 3. **RETORNO** (`type: 'return'`)
**Cuándo:** Al crear una devolución de venta
**Función RPC:** Alguna función de retornos (probablemente `create_return` o similar)
**Cantidad:** Positiva (se suma al stock)

```sql
-- Se ejecuta cuando se procesa una devolución:
{
  type: 'return',
  quantity: +X,  -- positivo porque se devolvió
  reference_id: return_id,
  variant_id: ...
}
```

---

### 4. **AJUSTE MANUAL** (`type: 'adjustment'`)
**Cuándo:** Al hacer ajustes manuales de inventario
**Función:** Probablemente una función RPC de ajuste manual
**Cantidad:** Puede ser positiva o negativa

```sql
-- Se ejecuta cuando un admin/manager ajusta el inventario:
{
  type: 'adjustment',
  quantity: +X o -X,
  reference_id: adjustment_id,
  variant_id: ...
}
```

---

## 📋 Estructura Actual de `stock_movements`

```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  club_id UUID,
  type TEXT,  -- 'sale' | 'restock' | 'adjustment' | 'return'
  quantity INTEGER,  -- positivo o negativo
  reference_id UUID,  -- ID de la venta/purchase order/etc
  created_at TIMESTAMP,
  variant_id UUID,
  inventory_item_id UUID
)
```

**Falta:** ❌ `user_id` (no se registra quién hizo el movimiento)

---

## 🎯 Mejora Propuesta: Agregar `user_id`

### ¿Por qué es importante?

1. **Auditoría:** Saber quién hizo cada movimiento de stock
2. **Responsabilidad:** Identificar quién hizo ajustes o ventas
3. **Reportes:** Analizar productividad por vendedor
4. **Seguridad:** Detectar patrones sospechosos

### Cambios Necesarios:

1. **Agregar columna `user_id`** a la tabla `stock_movements`
2. **Modificar TODAS las funciones** que insertan en `stock_movements` para incluir `auth.uid()`

---

## 🔧 Funciones que Necesitan Modificación

### Función 1: `create_stock_movement()` (ventas)
**Ubicación:** Trigger en `sale_items`
**Modificación:** Agregar `user_id` obtenido de `auth.uid()` o de la tabla `sales`

### Función 2: `handle_purchase_order_delivered()` (reabastecimientos)
**Ubicación:** Trigger en `purchase_orders`
**Modificación:** Agregar `user_id` obtenido de `auth.uid()`

### Función 3: Funciones de retornos
**Modificación:** Agregar `user_id` obtenido de `auth.uid()`

### Función 4: Funciones de ajustes
**Modificación:** Agregar `user_id` obtenido de `auth.uid()`

---

## 📝 Ejemplo de Registro Mejorado

### Antes:
```json
{
  "id": "uuid",
  "club_id": "uuid",
  "type": "sale",
  "quantity": -5,
  "reference_id": "sale_uuid",
  "variant_id": "uuid",
  "created_at": "2024-01-15 10:30:00"
}
```

### Después (con user_id):
```json
{
  "id": "uuid",
  "club_id": "uuid",
  "type": "sale",
  "quantity": -5,
  "reference_id": "sale_uuid",
  "variant_id": "uuid",
  "user_id": "profile_uuid",  // ⬅️ NUEVO
  "created_at": "2024-01-15 10:30:00"
}
```

Ahora sabrás que fue el vendedor Juan quien hizo la venta.

---

## 🚀 Próximos Pasos

1. ✅ Crear migración para agregar columna `user_id`
2. ✅ Modificar función `create_stock_movement()`
3. ✅ Modificar función `handle_purchase_order_delivered()`
4. ✅ Buscar y modificar funciones de retornos y ajustes
5. ✅ Agregar foreign key constraint a `profiles`
6. ✅ Actualizar políticas RLS si es necesario
