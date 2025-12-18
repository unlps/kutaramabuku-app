-- Drop the existing policy
DROP POLICY IF EXISTS "Book owners can update author status" ON public.book_authors;

-- Create a new policy that allows:
-- 1. Book owners to update any author entry
-- 2. Invited authors to update their own pending status
CREATE POLICY "Book owners can update author status" 
ON public.book_authors 
FOR UPDATE 
USING (
  (EXISTS ( SELECT 1 FROM ebooks WHERE ebooks.id = book_authors.ebook_id AND ebooks.user_id = auth.uid()))
  OR (user_id = auth.uid())
)
WITH CHECK (
  (EXISTS ( SELECT 1 FROM ebooks WHERE ebooks.id = book_authors.ebook_id AND ebooks.user_id = auth.uid()))
  OR (user_id = auth.uid())
);