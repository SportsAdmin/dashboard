-- Fix profiles RLS policy to allow role-based access
-- This allows managers to see profiles in their club and admins to see all profiles

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "profiles_select_policy" ON "public"."profiles";

-- Create new policy with role-based access
CREATE POLICY "profiles_select_policy"
ON "public"."profiles"
FOR SELECT
TO authenticated
USING (
  -- Users can always read their own profile
  id = auth.uid()
  OR
  -- Admins can read all profiles
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  OR
  -- Managers can read profiles from their own club
  (
    EXISTS (
      SELECT 1 FROM profiles AS manager_profile
      WHERE manager_profile.id = auth.uid()
      AND manager_profile.role = 'manager'
      AND manager_profile.club_id IS NOT NULL
      AND manager_profile.club_id = profiles.club_id
    )
  )
);
