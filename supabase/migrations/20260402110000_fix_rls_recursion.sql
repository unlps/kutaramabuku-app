-- Fix infinite recursion between ebooks and book_authors RLS policies

-- Create a security definer function to check collaboration without triggering book_authors RLS
CREATE OR REPLACE FUNCTION public.is_collaborator(book_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.book_authors
    WHERE ebook_id = book_id
      AND user_id = check_user_id
      AND status = 'accepted'
  );
$$;

-- Drop the recursive policy from ebooks
DROP POLICY IF EXISTS "Users can view own, public, or collaborated ebooks" ON public.ebooks;

-- Recreate the ebooks SELECT policy using the security definer function to avoid recursion
CREATE POLICY "Users can view own, public, or collaborated ebooks"
ON public.ebooks FOR SELECT
USING (
  COALESCE(is_public, false) = true
  OR auth.uid() = user_id
  OR public.is_collaborator(id, auth.uid())
);

-- Similarly, we must fix the UPDATE policy for ebooks which also has the same subquery issue
DROP POLICY IF EXISTS "Users can update own ebooks or as accepted collaborator" ON public.ebooks;

CREATE POLICY "Users can update own ebooks or as accepted collaborator"
ON public.ebooks FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.is_collaborator(id, auth.uid())
);

-- Fix chapters SELECT policy
DROP POLICY IF EXISTS "Users can view chapters of their ebooks or as collaborator" ON public.chapters;
CREATE POLICY "Users can view chapters of their ebooks or as collaborator"
ON public.chapters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = chapters.ebook_id 
    AND (
      ebooks.user_id = auth.uid()
      OR public.is_collaborator(ebooks.id, auth.uid())
    )
  )
);

-- Fix chapters UPDATE policy
DROP POLICY IF EXISTS "Users can update chapters of their ebooks or as collaborator" ON public.chapters;
CREATE POLICY "Users can update chapters of their ebooks or as collaborator"
ON public.chapters FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = chapters.ebook_id 
    AND (
      ebooks.user_id = auth.uid()
      OR public.is_collaborator(ebooks.id, auth.uid())
    )
  )
);

-- Fix chapters INSERT policy
DROP POLICY IF EXISTS "Users can create chapters for their ebooks or as collaborator" ON public.chapters;
CREATE POLICY "Users can create chapters for their ebooks or as collaborator"
ON public.chapters FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = chapters.ebook_id 
    AND (
      ebooks.user_id = auth.uid()
      OR public.is_collaborator(ebooks.id, auth.uid())
    )
  )
);

-- Fix chapters DELETE policy
DROP POLICY IF EXISTS "Users can delete chapters of their ebooks or as collaborator" ON public.chapters;
CREATE POLICY "Users can delete chapters of their ebooks or as collaborator"
ON public.chapters FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = chapters.ebook_id 
    AND (
      ebooks.user_id = auth.uid()
      OR public.is_collaborator(ebooks.id, auth.uid())
    )
  )
);
