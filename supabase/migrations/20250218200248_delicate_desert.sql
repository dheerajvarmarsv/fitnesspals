-- Create function to delete user and all associated data
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid;
BEGIN
  -- Get the user ID of the authenticated user
  uid := auth.uid();
  
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user's profile (this will cascade to other tables due to FK)
  DELETE FROM public.profiles WHERE id = uid;
  
  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;