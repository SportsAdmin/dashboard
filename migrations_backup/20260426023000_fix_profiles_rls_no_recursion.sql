-- Fix profiles RLS policy using security definer functions to avoid infinite recursion
-- This allows managers to see profiles in their club and admins to see all profiles

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "profiles_select_policy" ON "public"."profiles";

-- Create new policy with role-based access using security definer functions
-- This avoids recursion by using functions that bypass RLS
CREATE POLICY "profiles_select_policy"
ON "public"."profiles"
FOR SELECT
TO authenticated
USING (
  -- Users can always read their own profile
  id = auth.uid()
  OR
  -- Admins can read all profiles
  get_current_user_role() = 'admin'
  OR
  -- Managers can read profiles from their own club
  (
    get_current_user_role() = 'manager'
    AND get_current_user_club_id() IS NOT NULL
    AND club_id = get_current_user_club_id()
  )
);
