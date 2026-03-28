-- =============================================================================
-- Fix: Submissions queue missing relationship and existing books
-- =============================================================================

-- 0. Clean up invalid data that would break the foreign key constraint
-- (e.g. users who submitted a book but don't have a profile in public.profiles)
DELETE FROM public.book_submissions 
WHERE submitted_by NOT IN (SELECT id FROM public.profiles);

-- 1. Fix the foreign key constraint so PostgREST can automatically detect the relationship
-- between book_submissions and profiles (the frontend query uses submitter:profiles)
ALTER TABLE public.book_submissions DROP CONSTRAINT IF EXISTS book_submissions_submitted_by_fkey;

ALTER TABLE public.book_submissions 
  ADD CONSTRAINT book_submissions_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Populate the book_submissions table with all existing ebooks from KutaraMabuku
-- so that reviewers in ValidaMabuku have items in their review queue.
-- We default them to 'pending_review'.
INSERT INTO public.book_submissions (ebook_id, submitted_by, status, submitted_at)
SELECT e.id, e.user_id, 'pending_review', COALESCE(e.updated_at, e.created_at, now())
FROM public.ebooks e
WHERE NOT EXISTS (
  SELECT 1 FROM public.book_submissions bs WHERE bs.ebook_id = e.id
)
AND e.user_id IN (SELECT id FROM public.profiles)
ON CONFLICT DO NOTHING;
