-- Drop the overly permissive policy that exposes all profile data including emails
DROP POLICY IF EXISTS "Profiles are viewable by everyone for reviews" ON public.profiles;

-- Create a view for public profile access that excludes sensitive fields (email)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  username,
  avatar_url,
  bio,
  social_link,
  is_private,
  created_at
FROM public.profiles;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- Create a more restrictive RLS policy for the base profiles table
-- Users can only view their own profile directly from the base table
-- Other users must use the profiles_public view
CREATE POLICY "Users can view own full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- The existing "Users can view own profile" policy might conflict, drop it first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;