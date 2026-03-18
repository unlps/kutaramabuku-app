-- Submission workflow for ebook publication

CREATE OR REPLACE FUNCTION public.submit_book_for_review(p_ebook_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_title text;
  v_existing_active uuid;
  v_submission_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id, title
  INTO v_owner_id, v_title
  FROM public.ebooks
  WHERE id = p_ebook_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Ebook not found';
  END IF;

  IF v_owner_id <> v_user_id THEN
    RAISE EXCEPTION 'Only the ebook owner can submit it for review';
  END IF;

  SELECT id
  INTO v_existing_active
  FROM public.book_submissions
  WHERE ebook_id = p_ebook_id
    AND status IN ('pending_review', 'in_review')
  ORDER BY submitted_at DESC
  LIMIT 1;

  IF v_existing_active IS NOT NULL THEN
    RAISE EXCEPTION 'This ebook is already under review';
  END IF;

  UPDATE public.ebooks
  SET
    is_public = false,
    published_at = NULL,
    updated_at = now()
  WHERE id = p_ebook_id;

  INSERT INTO public.book_submissions (ebook_id, submitted_by, status, submitted_at)
  VALUES (p_ebook_id, v_user_id, 'pending_review', now())
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reviewer_resolve_submission(
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
    is_public = (p_status = 'approved'),
    published_at = CASE
      WHEN p_status = 'approved' THEN COALESCE(published_at, now())
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = v_submission.ebook_id;

  SELECT title
  INTO v_ebook_title
  FROM public.ebooks
  WHERE id = v_submission.ebook_id;

  IF p_status = 'approved' THEN
    v_notification_title := 'Livro aprovado';
    v_notification_message := format('O livro "%s" foi aprovado e já está público.', v_ebook_title);
  ELSIF p_status = 'revision_requested' THEN
    v_notification_title := 'Revisão solicitada';
    v_notification_message := format('Os reviewers pediram alterações no livro "%s".', v_ebook_title);
  ELSE
    v_notification_title := 'Livro rejeitado';
    v_notification_message := format('O livro "%s" foi rejeitado na revisão.', v_ebook_title);
  END IF;

  PERFORM public.create_system_notification(
    v_submission.submitted_by,
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

  RETURN v_submission.ebook_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_ebook_publication_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.review_resolution', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_public := false;
    RETURN NEW;
  END IF;

  IF NEW.is_public IS TRUE AND COALESCE(OLD.is_public, false) IS DISTINCT FROM NEW.is_public THEN
    RAISE EXCEPTION 'Ebooks só podem ficar públicos após aprovação dos reviewers';
  END IF;

  IF (
    COALESCE(OLD.is_public, false) = true
    OR EXISTS (
      SELECT 1
      FROM public.book_submissions bs
      WHERE bs.ebook_id = OLD.id
        AND bs.status IN ('pending_review', 'in_review', 'approved')
      ORDER BY bs.submitted_at DESC
      LIMIT 1
    )
  ) AND (
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.author IS DISTINCT FROM OLD.author
    OR NEW.genre IS DISTINCT FROM OLD.genre
    OR NEW.price IS DISTINCT FROM OLD.price
    OR NEW.template_id IS DISTINCT FROM OLD.template_id
    OR NEW.cover_image IS DISTINCT FROM OLD.cover_image
    OR NEW.type IS DISTINCT FROM OLD.type
  ) THEN
    RAISE EXCEPTION 'Este livro está bloqueado para edição no estado atual';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_ebook_publication_rules ON public.ebooks;
CREATE TRIGGER trigger_enforce_ebook_publication_rules
BEFORE INSERT OR UPDATE ON public.ebooks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ebook_publication_rules();

CREATE OR REPLACE FUNCTION public.enforce_chapter_review_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_ebook_id uuid;
  v_locked boolean;
BEGIN
  v_ebook_id := COALESCE(NEW.ebook_id, OLD.ebook_id);

  SELECT
    COALESCE(e.is_public, false)
    OR EXISTS (
      SELECT 1
      FROM public.book_submissions bs
      WHERE bs.ebook_id = v_ebook_id
        AND bs.status IN ('pending_review', 'in_review', 'approved')
      ORDER BY bs.submitted_at DESC
      LIMIT 1
    )
  INTO v_locked
  FROM public.ebooks e
  WHERE e.id = v_ebook_id;

  IF v_locked THEN
    RAISE EXCEPTION 'Os capítulos deste livro estão bloqueados no estado atual';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_chapter_review_lock ON public.chapters;
CREATE TRIGGER trigger_enforce_chapter_review_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.enforce_chapter_review_lock();
