-- Collaboration invitations, responses, and publication ownership rules

-- Allow accepted collaborators to read private ebooks they collaborate on.
DROP POLICY IF EXISTS "Users can view own ebooks" ON public.ebooks;
DROP POLICY IF EXISTS "Public ebooks are viewable by everyone" ON public.ebooks;

CREATE POLICY "Users can view own, public, or collaborated ebooks"
ON public.ebooks FOR SELECT
USING (
  COALESCE(is_public, false) = true
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.book_authors
    WHERE book_authors.ebook_id = ebooks.id
      AND book_authors.user_id = auth.uid()
      AND book_authors.status = 'accepted'
  )
);

CREATE OR REPLACE FUNCTION public.invite_book_collaborator(
  p_ebook_id uuid,
  p_invited_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id uuid := auth.uid();
  v_ebook record;
  v_book_author_id uuid;
  v_existing_status text;
  v_existing_notification_id uuid;
  v_inviter_name text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, user_id, title
  INTO v_ebook
  FROM public.ebooks
  WHERE id = p_ebook_id;

  IF v_ebook.id IS NULL THEN
    RAISE EXCEPTION 'Ebook not found';
  END IF;

  IF v_ebook.user_id <> v_requester_id THEN
    RAISE EXCEPTION 'Only the ebook owner can invite collaborators';
  END IF;

  IF p_invited_user_id IS NULL THEN
    RAISE EXCEPTION 'Invited author is required';
  END IF;

  IF p_invited_user_id = v_requester_id THEN
    RAISE EXCEPTION 'The ebook owner is already the primary author';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_invited_user_id
  ) THEN
    RAISE EXCEPTION 'Invited author not found';
  END IF;

  SELECT
    COALESCE(NULLIF(trim(full_name), ''), NULLIF(trim(username), ''), 'Autor')
  INTO v_inviter_name
  FROM public.profiles
  WHERE id = v_requester_id;

  SELECT id, status
  INTO v_book_author_id, v_existing_status
  FROM public.book_authors
  WHERE ebook_id = p_ebook_id
    AND user_id = p_invited_user_id;

  IF v_book_author_id IS NULL THEN
    INSERT INTO public.book_authors (
      ebook_id,
      user_id,
      status,
      is_primary
    )
    VALUES (
      p_ebook_id,
      p_invited_user_id,
      'pending',
      false
    )
    RETURNING id INTO v_book_author_id;
  ELSIF v_existing_status = 'accepted' THEN
    RAISE EXCEPTION 'This author is already a collaborator on this book';
  ELSIF v_existing_status = 'pending' THEN
    SELECT id
    INTO v_existing_notification_id
    FROM public.notifications
    WHERE user_id = p_invited_user_id
      AND type = 'collaboration_request'
      AND is_read = false
      AND COALESCE(data->>'book_author_id', '') = v_book_author_id::text
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_notification_id IS NOT NULL THEN
      RETURN v_book_author_id;
    END IF;

    UPDATE public.book_authors
    SET updated_at = now()
    WHERE id = v_book_author_id;
  ELSE
    UPDATE public.book_authors
    SET status = 'pending',
        updated_at = now()
    WHERE id = v_book_author_id;
  END IF;

  UPDATE public.notifications
  SET
    is_read = true,
    data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
      'superseded', true,
      'superseded_at', now()
    )
  WHERE user_id = p_invited_user_id
    AND type = 'collaboration_request'
    AND is_read = false
    AND COALESCE(data->>'book_author_id', '') = v_book_author_id::text;

  v_notification_title := 'Convite para colaborar';
  v_notification_message := format(
    '%s convidou-te para colaborar no livro "%s".',
    v_inviter_name,
    v_ebook.title
  );

  PERFORM public.create_system_notification(
    p_invited_user_id,
    'collaboration_request',
    v_notification_title,
    v_notification_message,
    jsonb_build_object(
      'ebook_id', p_ebook_id,
      'book_author_id', v_book_author_id,
      'ebook_title', v_ebook.title,
      'inviter_id', v_requester_id,
      'inviter_name', v_inviter_name,
      'response_status', 'pending'
    )
  );

  RETURN v_book_author_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_collaboration_invite(
  p_book_author_id uuid,
  p_accept boolean,
  p_notification_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id uuid := auth.uid();
  v_book_author record;
  v_response_status text := CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END;
  v_collaborator_name text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    ba.id,
    ba.user_id,
    ba.status,
    ba.ebook_id,
    e.user_id AS owner_id,
    e.title AS ebook_title
  INTO v_book_author
  FROM public.book_authors ba
  JOIN public.ebooks e ON e.id = ba.ebook_id
  WHERE ba.id = p_book_author_id;

  IF v_book_author.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_book_author.user_id <> v_requester_id THEN
    RAISE EXCEPTION 'You can only respond to your own invitations';
  END IF;

  IF v_book_author.status = v_response_status THEN
    RETURN v_book_author.status;
  END IF;

  IF v_book_author.status <> 'pending' THEN
    RAISE EXCEPTION 'This invitation has already been answered';
  END IF;

  UPDATE public.book_authors
  SET status = v_response_status,
      updated_at = now()
  WHERE id = p_book_author_id;

  UPDATE public.notifications
  SET
    is_read = true,
    data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
      'response_status', v_response_status,
      'responded_at', now()
    )
  WHERE user_id = v_requester_id
    AND type = 'collaboration_request'
    AND (
      (p_notification_id IS NOT NULL AND id = p_notification_id)
      OR COALESCE(data->>'book_author_id', '') = p_book_author_id::text
    );

  SELECT
    COALESCE(NULLIF(trim(full_name), ''), NULLIF(trim(username), ''), 'Autor')
  INTO v_collaborator_name
  FROM public.profiles
  WHERE id = v_requester_id;

  v_notification_title := CASE
    WHEN p_accept THEN 'Convite aceite'
    ELSE 'Convite recusado'
  END;

  v_notification_message := CASE
    WHEN p_accept THEN format(
      '%s aceitou colaborar no livro "%s".',
      v_collaborator_name,
      v_book_author.ebook_title
    )
    ELSE format(
      '%s recusou colaborar no livro "%s".',
      v_collaborator_name,
      v_book_author.ebook_title
    )
  END;

  PERFORM public.create_system_notification(
    v_book_author.owner_id,
    CASE
      WHEN p_accept THEN 'collaboration_accepted'
      ELSE 'collaboration_rejected'
    END,
    v_notification_title,
    v_notification_message,
    jsonb_build_object(
      'ebook_id', v_book_author.ebook_id,
      'ebook_title', v_book_author.ebook_title,
      'book_author_id', p_book_author_id,
      'collaborator_id', v_requester_id,
      'collaborator_name', v_collaborator_name,
      'response_status', v_response_status
    )
  );

  RETURN v_response_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_collaborator_ebook_permissions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_requester_id uuid := auth.uid();
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF v_requester_id IS NULL OR v_requester_id = OLD.user_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.book_authors
    WHERE book_authors.ebook_id = OLD.id
      AND book_authors.user_id = v_requester_id
      AND book_authors.status = 'accepted'
  ) THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.is_public IS DISTINCT FROM OLD.is_public
      OR NEW.publication_status IS DISTINCT FROM OLD.publication_status
      OR NEW.scheduled_publish_at IS DISTINCT FROM OLD.scheduled_publish_at
      OR NEW.published_at IS DISTINCT FROM OLD.published_at THEN
      RAISE EXCEPTION 'Collaborators can edit content but cannot manage publication settings';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_collaborator_ebook_permissions ON public.ebooks;
CREATE TRIGGER trigger_enforce_collaborator_ebook_permissions
BEFORE UPDATE ON public.ebooks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_collaborator_ebook_permissions();

CREATE OR REPLACE FUNCTION public.submit_book_for_review(p_ebook_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_existing_active uuid;
  v_submission_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id
  INTO v_owner_id
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
    publication_status = 'under_review',
    scheduled_publish_at = NULL,
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

  SELECT title
  INTO v_ebook_title
  FROM public.ebooks
  WHERE id = v_submission.ebook_id;

  IF p_status = 'approved' THEN
    v_notification_title := 'Livro aprovado';
    v_notification_message := format(
      'O livro "%s" foi aprovado. JÃ¡ podes publicar ou agendar a publicaÃ§Ã£o.',
      v_ebook_title
    );
  ELSIF p_status = 'revision_requested' THEN
    v_notification_title := 'RevisÃ£o solicitada';
    v_notification_message := format('Os reviewers pediram alteraÃ§Ãµes no livro "%s".', v_ebook_title);
  ELSE
    v_notification_title := 'Livro rejeitado';
    v_notification_message := format('O livro "%s" foi rejeitado na revisÃ£o.', v_ebook_title);
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

CREATE OR REPLACE FUNCTION public.publish_ebook(p_ebook_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id uuid := auth.uid();
  v_ebook record;
  v_sub record;
BEGIN
  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_ebook
  FROM public.ebooks
  WHERE id = p_ebook_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ebook not found';
  END IF;

  IF v_ebook.user_id <> v_requester_id THEN
    RAISE EXCEPTION 'Only the ebook owner can publish it';
  END IF;

  IF v_ebook.publication_status NOT IN ('approved', 'scheduled') THEN
    RAISE EXCEPTION 'This ebook is not ready to be published';
  END IF;

  UPDATE public.ebooks
  SET is_public = true,
      publication_status = 'published',
      scheduled_publish_at = NULL,
      published_at = now()
  WHERE id = p_ebook_id;

  UPDATE public.profiles
  SET is_private = false
  WHERE id = v_ebook.user_id;

  FOR v_sub IN
    SELECT user_id
    FROM public.release_subscriptions
    WHERE ebook_id = p_ebook_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_sub.user_id,
      'book_released',
      'Livro publicado!',
      'O livro "' || v_ebook.title || '" jÃ¡ estÃ¡ disponÃ­vel.',
      jsonb_build_object('ebook_id', p_ebook_id, 'ebook_title', v_ebook.title)
    );
  END LOOP;

  DELETE FROM public.release_subscriptions
  WHERE ebook_id = p_ebook_id;
END;
$$;
