-- =============================================================================
-- Fix: Relax RLS policies so admin operations work correctly
-- =============================================================================

-- ── reviewer_invitations: Fix INSERT to also accept senior_reviewer (removed role)
-- and ensure policy is robust
DROP POLICY IF EXISTS "Only admins can create invitations" ON public.reviewer_invitations;

CREATE POLICY "Only admins can create invitations"
  ON public.reviewer_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviewer_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
  );

-- ── book_submissions: Ensure the SELECT policy works for all active reviewers
-- (re-create to be safe in case it was lost or corrupted)
DROP POLICY IF EXISTS "Reviewers can see all submissions" ON public.book_submissions;

CREATE POLICY "Reviewers can see all submissions"
  ON public.book_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviewer_profiles
      WHERE id = auth.uid()
        AND status = 'active'
    )
  );

-- Also ensure writers can still see their own submissions
DROP POLICY IF EXISTS "Writers can see own submissions" ON public.book_submissions;

CREATE POLICY "Writers can see own submissions"
  ON public.book_submissions FOR SELECT
  USING (submitted_by = auth.uid());
