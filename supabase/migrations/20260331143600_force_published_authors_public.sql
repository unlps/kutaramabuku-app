-- Force profiles with published books to be public
update public.profiles p
set is_private = false
where p.is_private = true
  and exists (
    select 1 from public.ebooks e
    where e.user_id = p.id
      and (e.is_public = true or e.publication_status = 'published')
  );
