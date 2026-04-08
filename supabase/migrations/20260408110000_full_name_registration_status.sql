CREATE OR REPLACE FUNCTION public.get_full_name_registration_status(p_full_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT
    CASE
      WHEN u.id IS NULL THEN 'available'
      WHEN COALESCE(u.email_confirmed_at, u.confirmed_at) IS NULL THEN 'pending_verification'
      ELSE 'registered'
    END
  INTO v_status
  FROM (
    SELECT id, email_confirmed_at, confirmed_at
    FROM auth.users
    WHERE lower(trim(COALESCE(raw_user_meta_data->>'full_name', ''))) = lower(trim(p_full_name))
      AND trim(COALESCE(raw_user_meta_data->>'full_name', '')) <> ''
    ORDER BY created_at DESC
    LIMIT 1
  ) u
  RIGHT JOIN (SELECT 1) AS fallback ON TRUE;

  RETURN COALESCE(v_status, 'available');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_full_name_registration_status(TEXT) TO anon, authenticated;
