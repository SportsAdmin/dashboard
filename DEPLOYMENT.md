# 🚀 Deployment Guide: Create Club Feature

## Overview

The "Create Club" feature requires deploying a **Supabase Edge Function** to securely create users with admin privileges.

---

## ⚠️ SECURITY CRITICAL

**Why we need an Edge Function:**

- Creating users requires the **Service Role Key** (full admin access)
- **NEVER expose service role keys in frontend code**
- Edge Functions run **server-side** with secure environment variables
- Prevents unauthorized user creation and database manipulation

---

## 📋 Prerequisites

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Verify installation

```bash
supabase --version
```

### 3. Login to Supabase

```bash
supabase login
```

---

## 🗄️ Database Setup

### 1. Create clubs table

Run this SQL in Supabase SQL Editor:

```sql
-- Create clubs table
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read clubs"
  ON clubs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert clubs"
  ON clubs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Note: In production, restrict INSERT to super admins only
```

### 2. Update profiles table

```sql
-- Add club_id foreign key to profiles (if not exists)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS profiles_club_id_idx ON profiles(club_id);
```

---

## 🚀 Deploy Edge Function

### 1. Navigate to project directory

```bash
cd /Users/matiastorres/sites/soker/stores
```

### 2. Initialize Supabase (if not done)

```bash
supabase init
```

### 3. Link to your Supabase project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

**Find your project ID:**
- Go to https://app.supabase.com
- Select your project
- Project Settings → General → Reference ID

### 4. Deploy the Edge Function

```bash
supabase functions deploy create-club
```

**Expected output:**
```
Deploying Function create-club...
Function create-club deployed successfully!
Function URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/create-club
```

### 5. Verify deployment

```bash
supabase functions list
```

---

## 🧪 Test the Function

### Option 1: Test locally

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve create-club

# Test with curl (in another terminal)
curl -X POST \
  http://localhost:54321/functions/v1/create-club \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "club": {
      "name": "Test Club",
      "city": "Test City"
    },
    "admin": {
      "name": "Test Admin",
      "email": "test@example.com",
      "password": "TestPass123"
    }
  }'
```

### Option 2: Test from frontend

1. Login to your app
2. Navigate to `/clubs/create`
3. Fill in the form
4. Submit

---

## 🔍 Debugging

### View function logs

```bash
supabase functions logs create-club
```

### Follow logs in real-time

```bash
supabase functions logs create-club --follow
```

### Check function status

```bash
supabase functions list
```

---

## 🔐 Security Configuration (Optional)

### Add authorization logic

Edit `supabase/functions/create-club/index.ts`:

```typescript
// Check if user is a super admin
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'super_admin') {
  return new Response(
    JSON.stringify({ error: 'Only super admins can create clubs' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### Deploy updated function

```bash
supabase functions deploy create-club
```

---

## 🌍 Environment Variables

Edge Functions automatically have access to:

- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key

**No additional configuration needed!**

### Add custom secrets (if needed)

```bash
supabase secrets set MY_SECRET=value
```

### List secrets

```bash
supabase secrets list
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Edge Function is deployed
- [ ] `clubs` table exists with RLS enabled
- [ ] `profiles` table has `club_id` column
- [ ] Function appears in Supabase Dashboard → Edge Functions
- [ ] Can create club from frontend form
- [ ] Admin user is created in Authentication
- [ ] Club record appears in database
- [ ] Profile is linked to club
- [ ] Error handling works (try invalid data)

---

## 🔄 Update the Function

If you make changes to the Edge Function:

```bash
# Edit the file
vim supabase/functions/create-club/index.ts

# Deploy changes
supabase functions deploy create-club

# Verify
supabase functions logs create-club
```

---

## 🐛 Troubleshooting

### Function not found

```bash
# Re-deploy
supabase functions deploy create-club
```

### Permission errors

```bash
# Check if you're linked to the right project
supabase projects list

# Re-link if needed
supabase link --project-ref YOUR_PROJECT_ID
```

### CORS errors

The function includes CORS headers. If you still have issues:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specify your domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Database errors

```bash
# Check table exists
supabase db diff

# Reset local database (CAUTION: development only)
supabase db reset
```

---

## 📊 Monitoring

### View function metrics

1. Go to Supabase Dashboard
2. Edge Functions → create-club
3. View:
   - Invocations count
   - Errors
   - Response times
   - Logs

### Set up alerts

In Supabase Dashboard → Project Settings → Alerts:
- Set threshold for error rate
- Configure email/Slack notifications

---

## 🔗 Resources

- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Admin API Documentation](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [Deno Deploy Docs](https://deno.com/deploy/docs)

---

## 🎯 Production Checklist

Before going to production:

- [ ] Deploy Edge Function to production
- [ ] Set up database tables with RLS
- [ ] Configure authorization in Edge Function
- [ ] Test error scenarios
- [ ] Set up monitoring and alerts
- [ ] Document admin process
- [ ] Train team on club creation
- [ ] Create backup/rollback plan
- [ ] Test rollback on failed creation

---

## 🆘 Support

If you encounter issues:

1. Check function logs: `supabase functions logs create-club`
2. Verify database schema matches requirements
3. Test with curl to isolate frontend/backend issues
4. Check Supabase Dashboard for errors
5. Review Edge Function code for authorization logic

---

## 📝 Next Steps

After deployment:

1. Create a super admin user
2. Assign super admin role in profiles table
3. Test club creation from frontend
4. Monitor function performance
5. Set up email notifications for new clubs (optional)
6. Create clubs list page to view created clubs
