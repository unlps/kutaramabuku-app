CREATE OR REPLACE FUNCTION public.is_email_available(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_email_available(TEXT) TO anon, authenticated;
