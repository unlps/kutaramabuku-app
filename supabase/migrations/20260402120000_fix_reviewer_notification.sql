-- Fix reviewer notification so it goes to the ebook owner instead of the last submitter.
-- This ensures that when a book is approved, the owner receives the "Publish/Schedule" options.

CREATE OR REPLACE FUNCTION public.review_ebook_submission(
  p_submission_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer_id uuid := auth.uid();
  v_submission public.book_submissions%ROWTYPE;
  v_ebook_title text;
  v_ebook_owner_id uuid;
  v_notification_title text;
  v_notification_message text;
BEGIN
  IF v_reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reviewer_profiles
    WHERE id = v_reviewer_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active reviewers can resolve submissions';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'revision_requested') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;

  SELECT *
  INTO v_submission
  FROM public.book_submissions
  WHERE id = p_submission_id;

  IF v_submission.id IS NULL THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  UPDATE public.book_submissions
  SET
    status = p_status,
    reviewer_id = v_reviewer_id,
    review_notes = p_review_notes,
    rejection_reason = CASE
      WHEN p_status = 'rejected' THEN p_rejection_reason
      ELSE NULL
    END,
    reviewed_at = now()
  WHERE id = p_submission_id;

  PERFORM set_config('app.review_resolution', 'true', true);

  UPDATE public.ebooks
  SET
    is_public = false,
    publication_status = CASE
      WHEN p_status = 'approved' THEN 'approved'
      WHEN p_status = 'revision_requested' THEN 'changes_requested'
      ELSE 'rejected'
    END,
    scheduled_publish_at = NULL,
    published_at = NULL,
    updated_at = now()
  WHERE id = v_submission.ebook_id;

  -- Grab both title AND owner id
  SELECT title, user_id
  INTO v_ebook_title, v_ebook_owner_id
  FROM public.ebooks
  WHERE id = v_submission.ebook_id;

  IF p_status = 'approved' THEN
    v_notification_title := 'Livro aprovado';
    v_notification_message := format(
      'O livro "%s" foi aprovado. Já podes publicar ou agendar a publicação.',
      v_ebook_title
    );
  ELSIF p_status = 'revision_requested' THEN
    v_notification_title := 'Revisão solicitada';
    v_notification_message := format('Os reviewers pediram alterações no livro "%s".', v_ebook_title);
  ELSE
    v_notification_title := 'Livro rejeitado';
    v_notification_message := format('O livro "%s" foi rejeitado na revisão.', v_ebook_title);
  END IF;

  -- Notify the OWNER, not necessarily the submitter
  PERFORM public.create_system_notification(
    v_ebook_owner_id,
    'submission_reviewed',
    v_notification_title,
    v_notification_message,
    jsonb_build_object(
      'ebook_id', v_submission.ebook_id,
      'submission_id', v_submission.id,
      'status', p_status,
      'review_notes', COALESCE(p_review_notes, ''),
      'rejection_reason', COALESCE(p_rejection_reason, '')
    )
  );

  RETURN v_submission.id;
END;
$$;
