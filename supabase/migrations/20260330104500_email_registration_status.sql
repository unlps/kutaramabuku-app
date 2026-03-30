CREATE OR REPLACE FUNCTION public.get_email_registration_status(p_email TEXT)
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
    WHERE lower(email) = lower(trim(p_email))
    ORDER BY created_at DESC
    LIMIT 1
  ) u
  RIGHT JOIN (SELECT 1) AS fallback ON TRUE;

  RETURN COALESCE(v_status, 'available');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_registration_status(TEXT) TO anon, authenticated;
