-- Fix RLS policy for profiles table
-- Problem: Users cannot read their own profile on login because the policy
-- checks get_my_profile() which requires the profile to already be loaded

-- Drop existing policy
DROP POLICY IF EXISTS "read profiles" ON "public"."profiles";

-- Create new policy that allows users to read their own profile
-- AND allows admins/managers to read profiles in their scope
CREATE POLICY "read profiles"
ON "public"."profiles"
FOR SELECT
TO authenticated
USING (
  -- Users can always read their OWN profile (critical for login)
  auth.uid() = id
  OR
  -- Admins can read all profiles
  (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  OR
  -- Managers can read profiles from their club
  (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'manager'
      AND p.club_id IS NOT NULL
      AND p.club_id = profiles.club_id
    )
  )
);

-- Also ensure insert policy exists for new users
DROP POLICY IF EXISTS "insert profiles" ON "public"."profiles";

CREATE POLICY "insert profiles"
ON "public"."profiles"
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserting if the user is admin or manager
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
  -- Or if it's their own profile being created (for initial setup)
  OR auth.uid() = id
);

-- Update policy
DROP POLICY IF EXISTS "update profiles" ON "public"."profiles";

CREATE POLICY "update profiles"
ON "public"."profiles"
FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  auth.uid() = id
  OR
  -- Admins can update any profile
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
  OR
  -- Managers can update profiles in their club
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'manager'
    AND p.club_id IS NOT NULL
    AND p.club_id = profiles.club_id
  )
)
WITH CHECK (
  -- Same conditions for the new data
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'manager'
    AND p.club_id IS NOT NULL
    AND p.club_id = profiles.club_id
  )
);

-- Delete policy
DROP POLICY IF EXISTS "delete profiles" ON "public"."profiles";

CREATE POLICY "delete profiles"
ON "public"."profiles"
FOR DELETE
TO authenticated
USING (
  -- Only admins can delete profiles
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);
