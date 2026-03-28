-- =============================================================================
-- Fix: Allow admins and senior reviewers to update reviewer_invitations
-- (e.g. extend expiry of expired invites)
-- =============================================================================

-- Drop the restrictive existing policy
DROP POLICY IF EXISTS "Invitation can be updated on acceptance" ON public.reviewer_invitations;

-- Allow update on acceptance (anyone who is accepting)
CREATE POLICY "Invitation can be updated on acceptance"
  ON public.reviewer_invitations FOR UPDATE
  USING (true)
  WITH CHECK (status = 'accepted');

-- Allow admins and senior reviewers to update any invitation (extend, expire, etc.)
CREATE POLICY "Admins can manage invitations"
  ON public.reviewer_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.reviewer_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'senior_reviewer')
        AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviewer_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'senior_reviewer')
        AND status = 'active'
    )
  );

-- Also allow admins/senior reviewers to delete invitations
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.reviewer_invitations;

CREATE POLICY "Admins can delete invitations"
  ON public.reviewer_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.reviewer_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'senior_reviewer')
        AND status = 'active'
    )
  );
