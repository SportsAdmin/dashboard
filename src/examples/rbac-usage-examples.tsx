/**
 * RBAC Usage Examples
 *
 * This file contains practical examples of how to use Role-Based Access Control
 * in your application components.
 */

import { usePermissions, Can, HasRole, CanAccessRoute } from '@/hooks/use-permissions'
import { useRole } from '@/hooks/use-role'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@tanstack/react-router'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

// ============================================
// EXAMPLE 1: Conditional Button Rendering
// ============================================

/**
 * Example: Show "Create User" button only for admin and manager
 */
export function UsersPageExample() {
  const { can, isAdmin, isManager } = usePermissions()

  return (
    <div>
      <h1>Users</h1>

      {/* Method 1: Using can() function */}
      {can('users', 'create') && (
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Create User
        </Button>
      )}

      {/* Method 2: Using <Can> component */}
      <Can resource='users' action='create'>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Create User
        </Button>
      </Can>

      {/* Method 3: Using role checks */}
      {(isAdmin() || isManager()) && (
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Create User
        </Button>
      )}

      {/* Method 4: Using <HasRole> component */}
      <HasRole roles={['admin', 'manager']}>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Create User
        </Button>
      </HasRole>
    </div>
  )
}

// ============================================
// EXAMPLE 2: Conditional Actions in Table
// ============================================

interface Product {
  id: string
  name: string
  price: number
}

export function ProductsTableExample({ products }: { products: Product[] }) {
  const { can } = usePermissions()

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Price</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.name}</td>
            <td>${product.price}</td>
            <td>
              <div className='flex gap-2'>
                {/* Everyone can view */}
                <Button variant='ghost' size='icon'>
                  <Eye className='h-4 w-4' />
                </Button>

                {/* Only admin can edit */}
                <Can resource='products' action='update'>
                  <Button variant='ghost' size='icon'>
                    <Edit className='h-4 w-4' />
                  </Button>
                </Can>

                {/* Only admin can delete */}
                {can('products', 'delete') && (
                  <Button variant='ghost' size='icon'>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================
// EXAMPLE 3: Purchase Order Edit Button
// (Manager can only edit if status is "pending")
// ============================================

interface PurchaseOrder {
  id: string
  status: 'pending' | 'approved' | 'received' | 'cancelled'
  amount: number
}

export function PurchaseOrderCard({ order }: { order: PurchaseOrder }) {
  const { canEditPO, isAdmin } = usePermissions()

  // Admin can always edit, manager only if status is pending
  const canEdit = isAdmin() || canEditPO(order.status)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order #{order.id}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Status: {order.status}</p>
        <p>Amount: ${order.amount}</p>

        <div className='mt-4 flex gap-2'>
          {/* View button - everyone can see */}
          <Button variant='outline'>View Details</Button>

          {/* Edit button - conditional based on role and status */}
          {canEdit && (
            <Button>
              <Edit className='mr-2 h-4 w-4' />
              Edit Order
            </Button>
          )}

          {/* Delete button - admin only */}
          <Can resource='purchase-orders' action='delete'>
            <Button variant='destructive'>
              <Trash2 className='mr-2 h-4 w-4' />
              Delete
            </Button>
          </Can>
        </div>

        {/* Show warning if manager tries to edit non-pending order */}
        {!canEdit && order.status !== 'pending' && (
          <p className='mt-2 text-sm text-muted-foreground'>
            Orders can only be edited while in "pending" status
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// EXAMPLE 4: Conditional Navigation Links
// ============================================

export function NavigationExample() {
  const { canAccess } = usePermissions()

  return (
    <nav>
      <ul>
        {/* Always visible */}
        <li>
          <Link to='/'>Dashboard</Link>
        </li>

        {/* Show only if user can access */}
        {canAccess('/users') && (
          <li>
            <Link to='/users'>Users</Link>
          </li>
        )}

        {/* Using component */}
        <CanAccessRoute path='/clubs'>
          <li>
            <Link to='/clubs'>Clubs</Link>
          </li>
        </CanAccessRoute>

        {/* Show for specific roles */}
        <HasRole roles={['admin', 'manager']}>
          <li>
            <Link to='/purchase-orders'>Purchase Orders</Link>
          </li>
        </HasRole>
      </ul>
    </nav>
  )
}

// ============================================
// EXAMPLE 5: Create User Form with Role Selection
// ============================================

export function CreateUserFormExample() {
  const { canCreateUser, isAdmin } = usePermissions()

  return (
    <form>
      <div>
        <label>Name</label>
        <input type='text' />
      </div>

      <div>
        <label>Email</label>
        <input type='email' />
      </div>

      <div>
        <label>Role</label>
        <select>
          {/* Admin can create any role */}
          {isAdmin() && (
            <>
              <option value='admin'>Admin</option>
              <option value='manager'>Manager</option>
              <option value='seller'>Seller</option>
            </>
          )}

          {/* Manager can only create sellers */}
          {!isAdmin() && canCreateUser('seller') && <option value='seller'>Seller</option>}
        </select>
      </div>

      <Button type='submit'>Create User</Button>
    </form>
  )
}

// ============================================
// EXAMPLE 6: Entire Page Protection
// ============================================

/**
 * Example: Protect an entire page
 * Use this in your route definition
 */
import { ProtectedRoute } from '@/components/auth/protected-route'

export function ClubsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div>
        <h1>Clubs Management</h1>
        <p>Only admins can see this page</p>
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// EXAMPLE 7: Conditional Form Fields
// ============================================

export function ProductFormExample() {
  const { role } = useRole()

  return (
    <form>
      <div>
        <label>Product Name</label>
        <input type='text' />
      </div>

      <div>
        <label>Price</label>
        <input type='number' />
      </div>

      {/* Only admin can set cost price */}
      <HasRole roles={['admin']}>
        <div>
          <label>Cost Price (Internal)</label>
          <input type='number' />
          <p className='text-sm text-muted-foreground'>This field is only visible to admins</p>
        </div>
      </HasRole>

      {/* Show different submit buttons based on role */}
      {role === 'admin' ? (
        <Button type='submit'>Save & Publish</Button>
      ) : (
        <Button type='submit'>Submit for Approval</Button>
      )}
    </form>
  )
}

// ============================================
// EXAMPLE 8: Disable Buttons Instead of Hiding
// ============================================

export function DisabledButtonExample() {
  const { can } = usePermissions()

  const canDelete = can('products', 'delete')

  return (
    <div>
      {/* Option 1: Hide button */}
      {canDelete && <Button variant='destructive'>Delete</Button>}

      {/* Option 2: Disable button with tooltip */}
      <Button variant='destructive' disabled={!canDelete} title={!canDelete ? 'Insufficient permissions' : ''}>
        Delete
      </Button>
    </div>
  )
}

// ============================================
// EXAMPLE 9: Dynamic Menu Based on Permissions
// ============================================

export function ContextMenuExample() {
  const { can, isAdmin } = usePermissions()

  const menuItems = [
    { label: 'View', action: () => {}, show: true },
    { label: 'Edit', action: () => {}, show: can('products', 'update') },
    { label: 'Duplicate', action: () => {}, show: can('products', 'create') },
    { label: 'Delete', action: () => {}, show: isAdmin() },
  ].filter((item) => item.show)

  return (
    <div>
      {menuItems.map((item) => (
        <button key={item.label} onClick={item.action}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ============================================
// EXAMPLE 10: Complex Permission Logic
// ============================================

export function ComplexPermissionExample() {
  const { role, isAdmin, isManager } = usePermissions()
  const order = { status: 'pending', createdBy: 'user-123' }
  const currentUserId = 'user-123'

  // Complex logic: Can edit if:
  // - User is admin, OR
  // - User is manager AND status is pending, OR
  // - User created the order AND status is pending
  const canEditOrder =
    isAdmin() ||
    (isManager() && order.status === 'pending') ||
    (order.createdBy === currentUserId && order.status === 'pending')

  return (
    <div>
      <h2>Order #{order.status}</h2>

      {canEditOrder && <Button>Edit Order</Button>}

      {/* Show different messages based on role */}
      {!canEditOrder && (
        <div className='text-sm text-muted-foreground'>
          {role === 'seller' && <p>Sellers cannot edit orders after creation</p>}
          {role === 'manager' && order.status !== 'pending' && (
            <p>Managers can only edit pending orders</p>
          )}
        </div>
      )}
    </div>
  )
}
