-- Fix infinite recursion in profiles RLS policy
-- Solution: Use a simple policy that allows users to read their own profile
-- and check role-based permissions in application code

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "read profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "insert profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "update profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "delete profiles" ON "public"."profiles";

-- Simple read policy: users can read their own profile OR profiles in their scope
-- This avoids recursion by using a simple check without nested profile queries
CREATE POLICY "profiles_select_policy"
ON "public"."profiles"
FOR SELECT
TO authenticated
USING (
  -- Allow users to read their own profile (needed for auth)
  id = auth.uid()
  -- Note: For reading other profiles (admin/manager scope),
  -- we'll check permissions in the application layer or via RPC functions
  -- to avoid recursion issues
);

-- Insert policy: Only service role or via edge function can insert
CREATE POLICY "profiles_insert_policy"
ON "public"."profiles"
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow inserting own profile (for initial setup)
  id = auth.uid()
  -- Other inserts should go through edge functions with service role
);

-- Update policy: Users can update their own profile
-- Admins/managers update via application logic checking
CREATE POLICY "profiles_update_policy"
ON "public"."profiles"
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Delete policy: Only allow via service role (edge functions)
-- Regular users cannot delete profiles
CREATE POLICY "profiles_delete_policy"
ON "public"."profiles"
FOR DELETE
TO authenticated
USING (false); -- No direct deletes, only via edge functions

-- Create a security definer function to get user role safely
-- This runs with the permissions of the function owner, avoiding RLS
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;

-- Create a security definer function to get user club_id safely
CREATE OR REPLACE FUNCTION get_current_user_club_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_club_id UUID;
BEGIN
  SELECT club_id INTO user_club_id
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_club_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_club_id() TO authenticated;
