import { type Product } from './schema'

// Mock products data
export const products: Product[] = [
  {
    id: '1',
    name: 'Running Shoes Pro',
    category: 'Footwear',
    createdAt: '2026-03-15T10:00:00Z',
    variants: [
      { id: '1-1', size_id: 'US 9', color: 'Black', price: 129.99, stock: 3 },
      { id: '1-2', size_id: 'US 10', color: 'Black', price: 129.99, stock: 25 },
      { id: '1-3', size_id: 'US 11', color: 'White', price: 129.99, stock: 18 },
    ],
  },
  {
    id: '2',
    name: 'Basketball Jersey',
    category: 'Apparel',
    createdAt: '2026-03-14T09:30:00Z',
    variants: [
      { id: '2-1', size_id: 'M', color: 'Blue', price: 49.99, stock: 45 },
      { id: '2-2', size_id: 'L', color: 'Blue', price: 49.99, stock: 2 },
      { id: '2-3', size_id: 'XL', color: 'Red', price: 49.99, stock: 0 },
    ],
  },
  {
    id: '3',
    name: 'Tennis Racket Elite',
    category: 'Equipment',
    createdAt: '2026-03-13T14:20:00Z',
    variants: [
      { id: '3-1', size_id: 'Standard', color: 'Yellow', price: 199.99, stock: 12 },
    ],
  },
  {
    id: '4',
    name: 'Yoga Mat Premium',
    category: 'Accessories',
    createdAt: '2026-03-12T11:15:00Z',
    variants: [
      { id: '4-1', size_id: 'Standard', color: 'Purple', price: 39.99, stock: 30 },
      { id: '4-2', size_id: 'Standard', color: 'Green', price: 39.99, stock: 4 },
    ],
  },
  {
    id: '5',
    name: 'Swimming Goggles',
    category: 'Accessories',
    createdAt: '2026-03-11T16:45:00Z',
    variants: [
      { id: '5-1', size_id: 'Adult', color: 'Blue', price: 24.99, stock: 22 },
      { id: '5-2', size_id: 'Youth', color: 'Pink', price: 19.99, stock: 1 },
    ],
  },
  {
    id: '6',
    name: 'Gym Shorts',
    category: 'Apparel',
    createdAt: '2026-03-10T08:00:00Z',
    variants: [
      { id: '6-1', size_id: 'M', color: 'Black', price: 29.99, stock: 35 },
      { id: '6-2', size_id: 'L', color: 'Navy', price: 29.99, stock: 15 },
    ],
  },
]
