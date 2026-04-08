CREATE OR REPLACE FUNCTION public.create_collaboration_sent_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id uuid;
  v_book_author_id uuid;
  v_invited_user_id uuid;
  v_invited_name text;
BEGIN
  IF NEW.type <> 'collaboration_request' THEN
    RETURN NEW;
  END IF;

  v_inviter_id := NULLIF(NEW.data->>'inviter_id', '')::uuid;
  v_book_author_id := NULLIF(NEW.data->>'book_author_id', '')::uuid;

  IF v_inviter_id IS NULL OR v_book_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    ba.user_id,
    COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.username), ''), 'autor')
  INTO v_invited_user_id, v_invited_name
  FROM public.book_authors ba
  JOIN public.profiles p ON p.id = ba.user_id
  WHERE ba.id = v_book_author_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_inviter_id,
    'collaboration_invite_sent',
    'Convite enviado',
    format('Convite enviado para %s.', v_invited_name),
    jsonb_build_object(
      'ebook_id', NEW.data->>'ebook_id',
      'ebook_title', NEW.data->>'ebook_title',
      'book_author_id', v_book_author_id,
      'invited_user_id', v_invited_user_id,
      'invited_user_name', v_invited_name,
      'response_status', 'pending'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_collaboration_sent_notification ON public.notifications;
CREATE TRIGGER trigger_create_collaboration_sent_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.create_collaboration_sent_notification();

CREATE OR REPLACE FUNCTION public.cancel_book_collaboration_invite(
  p_book_author_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id uuid := auth.uid();
  v_book_author record;
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

  IF v_book_author.owner_id <> v_requester_id THEN
    RAISE EXCEPTION 'Only the ebook owner can cancel this invitation';
  END IF;

  IF v_book_author.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending invitations can be cancelled';
  END IF;

  UPDATE public.notifications
  SET
    is_read = true,
    data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
      'response_status', 'cancelled',
      'cancelled_at', now()
    )
  WHERE user_id = v_book_author.user_id
    AND type = 'collaboration_request'
    AND COALESCE(data->>'book_author_id', '') = p_book_author_id::text;

  UPDATE public.notifications
  SET
    is_read = true,
    data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
      'response_status', 'cancelled',
      'cancelled_at', now()
    )
  WHERE user_id = v_requester_id
    AND type = 'collaboration_invite_sent'
    AND COALESCE(data->>'book_author_id', '') = p_book_author_id::text;

  DELETE FROM public.book_authors
  WHERE id = p_book_author_id;

  RETURN 'cancelled';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_book_collaboration_invite(uuid) TO authenticated;
