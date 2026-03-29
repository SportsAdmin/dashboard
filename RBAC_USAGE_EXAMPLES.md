# Role-Based Access Control (RBAC) - Usage Examples

This guide shows how to use the RBAC system implemented in this application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Using the Auth Store](#using-the-auth-store)
3. [Using the useRole Hook](#using-the-userole-hook)
4. [Permission Checks](#permission-checks)
5. [Protected Routes](#protected-routes)
6. [Conditional UI Rendering](#conditional-ui-rendering)
7. [Sidebar Filtering](#sidebar-filtering)

---

## Architecture Overview

### Key Files

- **`src/store/useAuthStore.ts`** - Zustand store for user authentication and profile
- **`src/hooks/useRole.ts`** - Hook to access current user's role and info
- **`src/lib/permissions.ts`** - Permission helper functions
- **`src/components/auth/protected-route.tsx`** - Route protection component
- **`src/lib/sidebar-filter.ts`** - Sidebar filtering utilities
- **`src/routes/__root.tsx`** - Auth initialization on app mount

### Role Hierarchy

```typescript
type Role = 'admin' | 'manager' | 'seller'
```

**Permission Matrix:**

| Feature | Admin | Manager | Seller |
|---------|-------|---------|--------|
| View Users | ✅ | ✅ | ❌ |
| Create Users | ✅ | ✅ (seller only) | ❌ |
| Delete Users | ✅ | ❌ | ❌ |
| View Clubs | ✅ | ❌ | ❌ |
| Edit Purchase Order (pending) | ✅ | ✅ | ❌ |
| Edit Purchase Order (approved+) | ✅ | ❌ | ❌ |

---

## Using the Auth Store

The auth store is initialized automatically in `__root.tsx` and loads the user profile on mount.

### Manual Profile Refresh

```typescript
import { useAuthStore } from '@/store/useAuthStore'

function MyComponent() {
  const fetchProfile = useAuthStore(state => state.fetchProfile)

  const handleRefresh = async () => {
    await fetchProfile()
  }
}
```

### Sign Out

```typescript
import { useAuthStore } from '@/store/useAuthStore'

function SignOutButton() {
  const signOut = useAuthStore(state => state.signOut)

  return (
    <button onClick={signOut}>
      Sign Out
    </button>
  )
}
```

### Access User Data

```typescript
import { useAuthStore } from '@/store/useAuthStore'

function UserProfile() {
  const { user, profile, loading } = useAuthStore()

  if (loading) return <Loader />

  return (
    <div>
      <h2>{profile?.name}</h2>
      <p>Role: {profile?.role}</p>
      <p>Club ID: {profile?.club_id}</p>
    </div>
  )
}
```

---

## Using the useRole Hook

The `useRole` hook provides convenient access to the current user's role and related info.

### Basic Usage

```typescript
import { useRole } from '@/hooks/useRole'

function MyComponent() {
  const { role, club_id, name, loading, isAdmin, isManager, isSeller } = useRole()

  if (loading) return <Loader />

  return (
    <div>
      <h1>Welcome, {name}!</h1>
      {isAdmin && <AdminPanel />}
      {isManager && <ManagerPanel club_id={club_id} />}
      {isSeller && <SellerPanel />}
    </div>
  )
}
```

---

## Permission Checks

Use the permission helper functions from `src/lib/permissions.ts` to check access.

### Check Route Access

```typescript
import { useRole } from '@/hooks/useRole'
import { canAccessRoute } from '@/lib/permissions'

function Navigation() {
  const { role } = useRole()

  const canViewUsers = canAccessRoute(role, '/users')
  const canViewClubs = canAccessRoute(role, '/clubs')

  return (
    <nav>
      {canViewUsers && <Link to="/users">Users</Link>}
      {canViewClubs && <Link to="/clubs">Clubs</Link>}
    </nav>
  )
}
```

### Check Feature Permission

```typescript
import { useRole } from '@/hooks/useRole'
import { canCreateUsers, canDeleteUsers } from '@/lib/permissions'

function UserActions() {
  const { role } = useRole()

  return (
    <div>
      {canCreateUsers(role) && (
        <button>Create User</button>
      )}

      {canDeleteUsers(role) && (
        <button>Delete User</button>
      )}
    </div>
  )
}
```

### Check Purchase Order Edit Permission

```typescript
import { useRole } from '@/hooks/useRole'
import { canEditPurchaseOrder } from '@/lib/permissions'

function PurchaseOrderRow({ order }) {
  const { role } = useRole()

  const canEdit = canEditPurchaseOrder(role, order.status)

  return (
    <tr>
      <td>{order.id}</td>
      <td>{order.status}</td>
      <td>
        {canEdit ? (
          <button>Edit</button>
        ) : (
          <span className="text-muted">No permission</span>
        )}
      </td>
    </tr>
  )
}
```

---

## Protected Routes

Wrap route components with `ProtectedRoute` to enforce access control.

### Basic Usage

```typescript
import { ProtectedRoute } from '@/components/auth/protected-route'

function UsersPage() {
  return (
    <ProtectedRoute>
      <UsersContent />
    </ProtectedRoute>
  )
}
```

The `ProtectedRoute` component will:
- Show a loader while checking permissions
- Redirect to `/login` if not authenticated
- Show an "Unauthorized" page if user lacks permission
- Render children if user has access

### With Explicit Roles

```typescript
import { ProtectedRoute } from '@/components/auth/protected-route'

function AdminPanel() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminContent />
    </ProtectedRoute>
  )
}
```

### Custom Redirect

```typescript
import { ProtectedRoute } from '@/components/auth/protected-route'

function SpecialPage() {
  return (
    <ProtectedRoute redirectTo="/dashboard">
      <SpecialContent />
    </ProtectedRoute>
  )
}
```

---

## Conditional UI Rendering

### Hide Buttons Based on Role

See `src/features/users/components/users-primary-buttons.tsx`:

```typescript
import { useRole } from '@/hooks/useRole'
import { canCreateUsers } from '@/lib/permissions'
import { Button } from '@/components/ui/button'

export function UsersPrimaryButtons() {
  const { role } = useRole()
  const canCreate = canCreateUsers(role)

  // Don't render if no permission
  if (!canCreate) return null

  return (
    <div>
      <Button>Invite User</Button>
      <Button>Add User</Button>
    </div>
  )
}
```

### Hide Delete Action Based on Role

See `src/features/users/components/data-table-row-actions.tsx`:

```typescript
import { useRole } from '@/hooks/useRole'
import { canDeleteUsers } from '@/lib/permissions'

export function DataTableRowActions({ row }) {
  const { role } = useRole()
  const canDelete = canDeleteUsers(role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>...</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Edit</DropdownMenuItem>

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500">
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Conditional Components

```typescript
import { useRole } from '@/hooks/useRole'

function Dashboard() {
  const { isAdmin, isManager, isSeller } = useRole()

  return (
    <div>
      <h1>Dashboard</h1>

      {isAdmin && <AdminStats />}

      {(isAdmin || isManager) && <ManagerTools />}

      {isSeller && <SellerQuickActions />}
    </div>
  )
}
```

---

## Sidebar Filtering

The sidebar automatically filters menu items based on role. See `src/components/layout/app-sidebar.tsx`.

### Adding Role Restrictions to Menu Items

Edit `src/components/layout/data/sidebar-data.ts`:

```typescript
{
  title: 'Users',
  url: '/users',
  icon: Users,
  roles: ['admin', 'manager'],  // Only visible to admin and manager
}

{
  title: 'Clubs',
  icon: Building2,
  roles: ['admin'],  // Only visible to admin
  items: [
    {
      title: 'All Clubs',
      url: '/clubs',
      roles: ['admin'],
    },
    {
      title: 'Create Club',
      url: '/clubs/create',
      roles: ['admin'],
    },
  ],
}
```

### How It Works

The sidebar uses `filterSidebarByRole` from `src/lib/sidebar-filter.ts`:

```typescript
import { useMemo } from 'react'
import { useRole } from '@/hooks/useRole'
import { filterSidebarByRole } from '@/lib/sidebar-filter'
import { getSidebarData } from './data/sidebar-data'

export function AppSidebar() {
  const { role } = useRole()
  const sidebarData = getSidebarData()

  const filteredNavGroups = useMemo(() => {
    if (!role) return []
    return filterSidebarByRole(sidebarData.navGroups, role)
  }, [sidebarData.navGroups, role])

  return (
    <Sidebar>
      {filteredNavGroups.map(group => (
        <NavGroup key={group.title} {...group} />
      ))}
    </Sidebar>
  )
}
```

---

## Complete Example: Purchase Orders

Here's a complete example showing how to implement RBAC for a purchase orders feature:

```typescript
// src/features/purchase-orders/index.tsx
import { useRole } from '@/hooks/useRole'
import { canEditPurchaseOrder, canDeletePurchaseOrder } from '@/lib/permissions'
import { ProtectedRoute } from '@/components/auth/protected-route'

function PurchaseOrdersPage() {
  return (
    <ProtectedRoute>
      <PurchaseOrdersContent />
    </ProtectedRoute>
  )
}

function PurchaseOrdersContent() {
  const { role, isAdmin } = useRole()
  const [orders, setOrders] = useState([])

  return (
    <div>
      <h1>Purchase Orders</h1>

      {isAdmin && (
        <button>Create Purchase Order</button>
      )}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.status}</td>
              <td>
                {canEditPurchaseOrder(role, order.status) && (
                  <button>Edit</button>
                )}

                {canDeletePurchaseOrder(role) && (
                  <button>Delete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## Summary

1. **Auth is initialized automatically** in `__root.tsx`
2. **Use `useRole()` hook** to get current user's role and info
3. **Use permission helpers** from `lib/permissions.ts` for access checks
4. **Wrap routes** with `<ProtectedRoute>` for page-level protection
5. **Conditionally render UI** based on permissions
6. **Sidebar filters automatically** based on role restrictions in sidebar-data.ts

For more details, see the implementation guide in `RBAC_IMPLEMENTATION_GUIDE.md`.
