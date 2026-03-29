export type CartItem = {
  id: string // inventory_item_id
  variant_id: string // product_variant_id (for sales table)
  productName: string
  size: string
  color: string
  price: number
  quantity: number
  stock: number
}
