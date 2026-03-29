# RBAC Implementation Guide

## 📋 Overview

This guide explains how to implement Role-Based Access Control (RBAC) in your application using the provided hooks, components, and utilities.

---

## 🎭 Roles

| Role | Access Level | Description |
|------|--------------|-------------|
| **admin** | Full Access | Can access and manage everything |
| **manager** | Medium Access | Same as seller + user management + dashboards + limited PO editing |
| **seller** | Limited Access | Can create sales, view products, inventory, and create purchase orders |

---

## 📁 File Structure

```
src/
├── hooks/
│   ├── use-role.ts                    # Hook to get current user role
│   └── use-permissions.ts             # Hook with permission utilities
├── config/
│   └── permissions.ts                 # Permissions configuration
├── components/
│   └── auth/
│       └── protected-route.tsx        # Route protection component
├── lib/
│   └── sidebar-filter.ts              # Sidebar filtering utilities
└── examples/
    └── rbac-usage-examples.tsx        # Usage examples
```

---

## 🚀 Quick Start

### 1. Basic Permission Check in Component

```tsx
import { usePermissions } from '@/hooks/use-permissions'

function MyComponent() {
  const { can, isAdmin, role } = usePermissions()

  return (
    <div>
      {/* Show button only if user can create products */}
      {can('products', 'create') && (
        <Button>Create Product</Button>
      )}

      {/* Show for admin only */}
      {isAdmin() && (
        <Button variant="destructive">Delete All</Button>
      )}

      {/* Show current role */}
      <p>Your role: {role}</p>
    </div>
  )
}
```

### 2. Protect an Entire Route

```tsx
import { ProtectedRoute } from '@/components/auth/protected-route'

export function AdminOnlyPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div>
        <h1>Admin Panel</h1>
        <p>Only admins can see this</p>
      </div>
    </ProtectedRoute>
  )
}
```

### 3. Conditional Rendering with Components

```tsx
import { Can, HasRole } from '@/hooks/use-permissions'

function ProductActions() {
  return (
    <div>
      {/* Show if user can update products */}
      <Can resource="products" action="update">
        <Button>Edit Product</Button>
      </Can>

      {/* Show for admin and manager only */}
      <HasRole roles={['admin', 'manager']}>
        <Button>View Reports</Button>
      </HasRole>
    </div>
  )
}
```

---

## 🔒 Permission Rules

### Admin

✅ Full access to everything
- All routes
- All CRUD operations
- All resources

### Manager

✅ **Can:**
- Access: `/dashboard`, `/products`, `/inventory`, `/sales`, `/purchase-orders`, `/users`, `/pos`
- Create users (only role = `seller`)
- View dashboards and summaries
- Edit purchase orders **ONLY if status = "pending"**
- Create and view sales
- View products and inventory

❌ **Cannot:**
- Access `/clubs` page
- Create/edit clubs
- Edit purchase orders if status ≠ "pending"

### Seller

✅ **Can:**
- Access: `/pos`, `/products`, `/inventory`, `/sales`, `/purchase-orders` (view only)
- Create sales
- View products and inventory
- Create purchase orders (cannot edit)
- View customers

❌ **Cannot:**
- Access `/clubs` page
- Access `/users` page
- Create users
- Edit purchase orders
- Access dashboard

---

## 📖 Common Use Cases

### 1. Hide/Show Buttons Based on Permission

```tsx
function UserActions() {
  const { can } = usePermissions()

  return (
    <div>
      {can('users', 'create') && (
        <Button>Create User</Button>
      )}

      {can('users', 'delete') && (
        <Button variant="destructive">Delete User</Button>
      )}
    </div>
  )
}
```

### 2. Purchase Order Edit (Manager Rule)

```tsx
function PurchaseOrderCard({ order }) {
  const { canEditPO, isAdmin } = usePermissions()

  // Admin can always edit, manager only if pending
  const canEdit = isAdmin() || canEditPO(order.status)

  return (
    <Card>
      <CardHeader>Order #{order.id}</CardHeader>
      <CardContent>
        <p>Status: {order.status}</p>

        {canEdit ? (
          <Button>Edit Order</Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Orders can only be edited while in "pending" status
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

### 3. Create User with Role Restriction

```tsx
function CreateUserForm() {
  const { canCreateUser, isAdmin } = usePermissions()

  return (
    <form>
      <label>Role</label>
      <select name="role">
        {/* Admin can create any role */}
        {isAdmin() && (
          <>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="seller">Seller</option>
          </>
        )}

        {/* Manager can only create sellers */}
        {!isAdmin() && canCreateUser('seller') && (
          <option value="seller">Seller</option>
        )}
      </select>
    </form>
  )
}
```

### 4. Conditional Navigation

```tsx
function Navigation() {
  const { canAccess } = usePermissions()

  return (
    <nav>
      {canAccess('/users') && (
        <Link to="/users">Users</Link>
      )}

      {canAccess('/clubs') && (
        <Link to="/clubs">Clubs</Link>
      )}

      {canAccess('/dashboard') && (
        <Link to="/dashboard">Dashboard</Link>
      )}
    </nav>
  )
}
```

### 5. Table Row Actions

```tsx
function ProductsTable({ products }) {
  const { can } = usePermissions()

  return (
    <table>
      <tbody>
        {products.map(product => (
          <tr key={product.id}>
            <td>{product.name}</td>
            <td>
              {/* Everyone can view */}
              <Button size="icon">
                <Eye className="h-4 w-4" />
              </Button>

              {/* Only if can update */}
              {can('products', 'update') && (
                <Button size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              {/* Only admin can delete */}
              {can('products', 'delete') && (
                <Button size="icon" variant="destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 🛠️ API Reference

### `useRole()`

Returns current user role and profile information.

```tsx
const { role, profile, loading, error, refetch } = useRole()
```

**Returns:**
- `role`: `'admin' | 'manager' | 'seller' | null`
- `profile`: User profile object with role info
- `loading`: Boolean indicating if data is being fetched
- `error`: Error message if fetch failed
- `refetch`: Function to manually refetch role

---

### `usePermissions()`

Main hook for permission checks.

```tsx
const {
  role,
  can,
  canAccess,
  canCreateUser,
  canEditPO,
  isAdmin,
  isManager,
  isSeller,
  hasRole
} = usePermissions()
```

**Methods:**

- `can(resource, action, context?)`: Check if user can perform action on resource
- `canAccess(path)`: Check if user can access a route
- `canCreateUser(targetRole)`: Check if user can create a user with target role
- `canEditPO(status)`: Check if user can edit purchase order with given status
- `isAdmin()`: Returns true if user is admin
- `isManager()`: Returns true if user is manager
- `isSeller()`: Returns true if user is seller
- `hasRole(...roles)`: Check if user has one of the specified roles

---

### Components

#### `<Can>`

Conditionally render based on action permission.

```tsx
<Can resource="products" action="create" fallback={<p>No access</p>}>
  <Button>Create Product</Button>
</Can>
```

#### `<HasRole>`

Conditionally render based on user role.

```tsx
<HasRole roles={['admin', 'manager']} fallback={<p>Admins only</p>}>
  <AdminPanel />
</HasRole>
```

#### `<CanAccessRoute>`

Conditionally render based on route access.

```tsx
<CanAccessRoute path="/clubs">
  <Link to="/clubs">Clubs</Link>
</CanAccessRoute>
```

#### `<ProtectedRoute>`

Wrap entire routes to protect them.

```tsx
<ProtectedRoute allowedRoles={['admin']}>
  <AdminPage />
</ProtectedRoute>
```

---

## 🔧 Modifying Permissions

To add or modify permissions, edit `/src/config/permissions.ts`:

```typescript
export const permissions: Record<Role, RolePermissions> = {
  admin: {
    canAccess: ['*'], // All routes
    resources: {
      products: { actions: ['manage'] }, // Full CRUD
    },
  },
  manager: {
    canAccess: ['/dashboard', '/products', '/users'],
    resources: {
      products: { actions: ['read', 'update'] },
      users: { actions: ['create', 'read'] },
    },
  },
  seller: {
    canAccess: ['/pos', '/products'],
    resources: {
      products: { actions: ['read'] },
    },
  },
}
```

---

## ✅ Best Practices

1. **Always use hooks and components** - Don't hardcode role checks
2. **Test edge cases** - Test what happens when user role changes
3. **Provide feedback** - Show why access is denied
4. **Use type-safe checks** - TypeScript will help catch errors
5. **Keep permissions centralized** - All rules in `permissions.ts`
6. **Use descriptive names** - Make permission checks readable
7. **Consider UX** - Disable vs hide buttons based on context

---

## 🐛 Troubleshooting

### User sees "Access Denied" on allowed page

**Solution:** Check `/src/config/permissions.ts` - ensure the route is listed in `canAccess` for that role.

### Sidebar items not filtering

**Solution:** Verify `app-sidebar.tsx` is using `filterSidebarByRole()` and `useRole()` hook.

### Permission checks always return false

**Solution:** Ensure user has a profile in the `profiles` table with a valid `role` column.

### Loading state never completes

**Solution:** Check Supabase connection and ensure `profiles` table exists and is accessible.

---

## 📝 Examples Location

See `/src/examples/rbac-usage-examples.tsx` for 10 complete, working examples covering:
- Conditional buttons
- Table actions
- Purchase order rules
- Navigation links
- Form fields
- Complex logic
- And more!

---

## 🔗 Related Files

- `/src/hooks/use-role.ts` - Role hook implementation
- `/src/hooks/use-permissions.ts` - Permission utilities
- `/src/config/permissions.ts` - Permission configuration
- `/src/components/auth/protected-route.tsx` - Route protection
- `/src/lib/sidebar-filter.ts` - Sidebar filtering
- `/src/examples/rbac-usage-examples.tsx` - Usage examples
