-- Add publication workflow columns to ebooks table
alter table public.ebooks
  add column if not exists publication_status text not null default 'draft',
  add column if not exists scheduled_publish_at timestamptz;

-- Backfill: mark already-public books as 'published'
update public.ebooks set publication_status = 'published' where is_public = true;

-- Backfill: mark books under active review as 'under_review'
update public.ebooks e
  set publication_status = 'under_review'
  where is_public is not true
    and exists (
      select 1 from public.book_submissions bs
      where bs.ebook_id = e.id
        and bs.status in ('pending_review', 'in_review')
    );

-- Create release_subscriptions table (bell notification for scheduled books)
create table if not exists public.release_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, ebook_id)
);

alter table public.release_subscriptions enable row level security;

create policy "Users can view own release subscriptions"
  on public.release_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can subscribe to releases"
  on public.release_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can unsubscribe from releases"
  on public.release_subscriptions for delete
  using (auth.uid() = user_id);

create index if not exists release_subs_user_idx on public.release_subscriptions(user_id);
create index if not exists release_subs_ebook_idx on public.release_subscriptions(ebook_id);

-- Function to publish a book (immediate or triggered by schedule)
create or replace function public.publish_ebook(p_ebook_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_ebook record;
  v_sub record;
begin
  -- Get the ebook
  select * into v_ebook from public.ebooks where id = p_ebook_id;
  if not found then
    raise exception 'Ebook not found';
  end if;

  -- Update ebook status
  update public.ebooks
  set is_public = true,
      publication_status = 'published',
      published_at = now()
  where id = p_ebook_id;

  -- Force author profile to public
  update public.profiles
  set is_private = false
  where id = v_ebook.user_id;

  -- Notify all release subscribers
  for v_sub in
    select user_id from public.release_subscriptions where ebook_id = p_ebook_id
  loop
    insert into public.notifications (user_id, type, title, message, data)
    values (
      v_sub.user_id,
      'book_released',
      'Livro publicado!',
      'O livro "' || v_ebook.title || '" já está disponível.',
      jsonb_build_object('ebook_id', p_ebook_id, 'ebook_title', v_ebook.title)
    );
  end loop;

  -- Clean up subscriptions
  delete from public.release_subscriptions where ebook_id = p_ebook_id;
end;
$$;
