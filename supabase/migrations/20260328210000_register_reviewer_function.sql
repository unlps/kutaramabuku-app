-- =============================================================================
-- Fix: Create reviewer profile via a SECURITY DEFINER function
-- This bypasses FK timing issues when email confirmation is enabled
-- and ensures the profile is created atomically with the invitation update.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.register_reviewer_from_invite(
  p_token        TEXT,
  p_full_name    TEXT,
  p_publisher    TEXT DEFAULT NULL,
  p_phone        TEXT DEFAULT NULL,
  p_dob          DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID;
  v_invitation   RECORD;
  v_secret_id    TEXT;
  v_profile      RECORD;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate the invitation token
  SELECT * INTO v_invitation
  FROM public.reviewer_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Generate a unique editor secret ID
  v_secret_id := 'VM-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 12));

  -- Insert the reviewer profile (SECURITY DEFINER bypasses RLS + FK timing)
  INSERT INTO public.reviewer_profiles (
    id,
    full_name,
    editor_secret_id,
    publisher_name,
    phone,
    date_of_birth,
    role,
    status
  ) VALUES (
    v_user_id,
    p_full_name,
    v_secret_id,
    p_publisher,
    p_phone,
    p_dob,
    'reviewer',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        publisher_name = EXCLUDED.publisher_name,
        phone = EXCLUDED.phone,
        date_of_birth = EXCLUDED.date_of_birth,
        updated_at = now()
  RETURNING * INTO v_profile;

  -- Mark the invitation as accepted
  UPDATE public.reviewer_invitations
  SET status = 'accepted'
  WHERE token = p_token;

  -- Return the created profile info
  RETURN jsonb_build_object(
    'id', v_profile.id,
    'full_name', v_profile.full_name,
    'editor_secret_id', v_profile.editor_secret_id,
    'role', v_profile.role,
    'status', v_profile.status
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.register_reviewer_from_invite(TEXT, TEXT, TEXT, TEXT, DATE) TO authenticated;
