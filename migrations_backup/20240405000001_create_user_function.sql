-- Function to create a new user with profile
-- This function needs to be run with service_role or a user with appropriate permissions

CREATE OR REPLACE FUNCTION create_user_with_profile(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_role TEXT,
  user_club_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Run with the privileges of the function owner
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
  current_user_role TEXT;
  current_user_club_id UUID;
BEGIN
  -- Get current user's profile
  SELECT role, club_id INTO current_user_role, current_user_club_id
  FROM profiles
  WHERE id = auth.uid();

  -- Check if user is authenticated
  IF current_user_role IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check permissions
  -- Managers can only create sellers in their club
  -- Admins can create any role
  IF current_user_role = 'manager' THEN
    IF user_role != 'seller' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Managers can only create sellers'
      );
    END IF;

    IF current_user_club_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Manager must be assigned to a club'
      );
    END IF;

    -- Force the new user to be in the manager's club
    user_club_id := current_user_club_id;
  ELSIF current_user_role = 'seller' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Sellers cannot create users'
    );
  END IF;

  -- Validate role
  IF user_role NOT IN ('admin', 'manager', 'seller') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role'
    );
  END IF;

  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();

  -- Insert into auth.users (this is a simplified approach)
  -- Note: In production, you should use Supabase Auth API via Edge Functions
  -- For now, we'll create the profile and the user needs to be created via Auth API

  -- Create profile first
  INSERT INTO profiles (id, name, role, club_id)
  VALUES (new_user_id, user_name, user_role, user_club_id);

  -- Return success
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'Profile created. User auth needs to be created via Auth API.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_with_profile TO authenticated;
