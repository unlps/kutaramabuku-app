-- =============================================================================
-- Fix: Allow active reviewers to read ebooks and profiles that are submitted
-- for review. The reviewer queue joins book_submissions -> ebooks -> profiles,
-- but the ebooks RLS only allows owners to read their own ebooks.
-- =============================================================================

-- Allow active reviewers to read ANY ebook (needed for the review queue join)
CREATE POLICY "Reviewers can view submitted ebooks"
  ON public.ebooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviewer_profiles
      WHERE id = auth.uid()
        AND status = 'active'
    )
  );

-- Allow active reviewers to read all profiles (for submitter info in queue)
-- (This may already exist via "Profiles are viewable by everyone for reviews"
--  but we add it explicitly in case it only covers specific contexts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Reviewers can view all profiles'
  ) THEN
    CREATE POLICY "Reviewers can view all profiles"
      ON public.profiles FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.reviewer_profiles
          WHERE id = auth.uid()
            AND status = 'active'
        )
      );
  END IF;
END $$;
