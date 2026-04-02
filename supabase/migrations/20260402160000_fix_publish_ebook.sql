-- Fix publish_ebook to bypass the enforce_ebook_publication_rules trigger
-- which blocks is_public = true when app.review_resolution is not true.

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

  -- TEMPORARILY disable the trigger blocking is_public changes
  PERFORM set_config('app.review_resolution', 'true', true);

  UPDATE public.ebooks
  SET is_public = true,
      publication_status = 'published',
      scheduled_publish_at = NULL,
      published_at = COALESCE(v_ebook.published_at, now()),
      updated_at = now()
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
      'O livro "' || v_ebook.title || '" já está disponível.',
      jsonb_build_object('ebook_id', p_ebook_id, 'ebook_title', v_ebook.title)
    );
  END LOOP;
END;
$$;
