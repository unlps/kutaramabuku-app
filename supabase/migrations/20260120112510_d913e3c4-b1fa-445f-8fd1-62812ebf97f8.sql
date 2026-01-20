-- Drop and recreate the profiles_public view with proper column order
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=off)
AS
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.bio,
    p.social_link,
    p.is_private,
    p.created_at
  FROM public.profiles p;