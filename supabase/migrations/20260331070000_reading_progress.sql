-- Create reading_progress table to track per-user reading position in ebooks
create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  current_page integer not null default 1,
  total_pages integer not null default 1,
  progress_percent numeric(5, 2) not null default 0,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, ebook_id)
);

-- Enable RLS
alter table public.reading_progress enable row level security;

-- Users can only see/edit their own reading progress
create policy "Users can view own reading progress"
  on public.reading_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own reading progress"
  on public.reading_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reading progress"
  on public.reading_progress for update
  using (auth.uid() = user_id);

create policy "Users can delete own reading progress"
  on public.reading_progress for delete
  using (auth.uid() = user_id);

-- Index for fast lookup by user
create index if not exists reading_progress_user_id_idx on public.reading_progress(user_id);
create index if not exists reading_progress_last_read_idx on public.reading_progress(user_id, last_read_at desc);
