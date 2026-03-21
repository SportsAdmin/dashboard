# Create Club Edge Function

## Overview

This Supabase Edge Function securely creates a new club with an admin user using the Admin API.

## 🔒 Security

**WHY USE AN EDGE FUNCTION?**

Creating users requires the **Supabase Service Role Key** which has **full admin access** to your database.

**❌ NEVER expose the service role key in frontend code!**

```typescript
// ❌ WRONG - Insecure (frontend)
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY) // EXPOSED!

// ✅ RIGHT - Secure (Edge Function/backend)
const supabaseAdmin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
```

**Edge Functions run server-side** where environment variables are secure.

---

## 📋 Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Supabase project** initialized:
   ```bash
   supabase init
   ```

3. **Database tables** created:
   - `clubs` table
   - `profiles` table

---

## 🚀 Deployment

### 1. Link your project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### 2. Deploy the function

```bash
supabase functions deploy create-club
```

### 3. Set secrets (if needed)

```bash
supabase secrets set MY_SECRET=value
```

---

## 🧪 Testing Locally

### 1. Start local Supabase

```bash
supabase start
```

### 2. Serve the function

```bash
supabase functions serve create-club
```

### 3. Test with curl

```bash
curl -X POST \
  http://localhost:54321/functions/v1/create-club \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "club": {
      "name": "FC Barcelona",
      "city": "Barcelona",
      "logo_url": "https://example.com/logo.png"
    },
    "admin": {
      "name": "John Doe",
      "email": "admin@fcbarcelona.com",
      "password": "SecurePass123"
    }
  }'
```

---

## 📡 API Reference

### Endpoint

```
POST /functions/v1/create-club
```

### Headers

```
Authorization: Bearer <user_jwt_token>
Content-Type: application/json
```

### Request Body

```typescript
{
  club: {
    name: string       // Required: Club name
    city: string       // Required: City location
    logo_url?: string  // Optional: Logo URL
  },
  admin: {
    name: string      // Required: Admin full name
    email: string     // Required: Admin email
    password: string  // Required: Admin password
  }
}
```

### Success Response (200)

```json
{
  "success": true,
  "clubId": "uuid",
  "userId": "uuid",
  "message": "Club \"FC Barcelona\" created successfully with admin admin@fcbarcelona.com"
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": "Invalid or expired token"
}
```

**403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```

**400 Bad Request**
```json
{
  "error": "Missing club or admin data"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to create admin user: <error_message>"
}
```

---

## 🔄 Process Flow

```
Frontend Form Submit
    ↓
Service: createClubWithAdmin()
    ↓
POST /functions/v1/create-club
    ↓
Edge Function (Server-Side)
    ↓
┌─────────────────────────────┐
│ 1. Verify JWT Token         │
│ 2. Check User Permissions   │
│ 3. Validate Request Data    │
│ 4. Create Admin User        │ ← Uses Admin API
│ 5. Create Club Record       │
│ 6. Create Admin Profile     │
│ 7. Return Success/Error     │
└─────────────────────────────┘
    ↓
Response to Frontend
    ↓
Show Success/Error Toast
```

---

## 🛡️ Authorization

The function includes a placeholder for authorization logic:

```typescript
// TODO: Add your authorization logic here
// Example: Check if user is a super admin
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'super_admin') {
  return new Response(
    JSON.stringify({ error: 'Insufficient permissions' }),
    { status: 403 }
  )
}
```

**Options:**
- ✅ Allow only super admins
- ✅ Allow users with specific roles
- ✅ Check user metadata
- ✅ Validate against allow-list

---

## ⚡ Error Handling & Rollback

The function implements **rollback logic** if any step fails:

**If club creation fails:**
```typescript
// Delete the created user
await supabaseAdmin.auth.admin.deleteUser(userId)
```

**If profile creation fails:**
```typescript
// Delete club and user
await supabaseAdmin.from('clubs').delete().eq('id', clubId)
await supabaseAdmin.auth.admin.deleteUser(userId)
```

This ensures **data consistency** and prevents orphaned records.

---

## 📊 Database Schema

### Clubs Table

```sql
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,  -- Same as auth.users.id
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🐛 Debugging

### View function logs

```bash
supabase functions logs create-club
```

### Test with detailed output

```bash
supabase functions serve create-club --debug
```

### Check environment variables

```bash
supabase secrets list
```

---

## 🔧 Environment Variables

The function uses these environment variables (auto-set by Supabase):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key (server-side only)

---

## 📝 Frontend Integration

The frontend service (`src/services/clubs.ts`) calls this Edge Function:

```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/create-club`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ club, admin }),
  }
)
```

---

## ⚙️ Configuration

No additional configuration needed. The function uses:
- Supabase environment variables (auto-set)
- CORS headers for browser requests
- JWT verification for authentication

---

## 🎯 Best Practices

✅ **Always validate JWT** before processing requests
✅ **Check user permissions** before creating resources
✅ **Validate all input data** to prevent injection
✅ **Implement rollback logic** for failed operations
✅ **Log errors** for debugging
✅ **Return descriptive error messages** to frontend
✅ **Use CORS headers** for browser compatibility

---

## 📚 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
