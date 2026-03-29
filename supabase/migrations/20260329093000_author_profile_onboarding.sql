ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS short_bio TEXT,
ADD COLUMN IF NOT EXISTS detailed_bio TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS writing_genres TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS writing_style TEXT,
ADD COLUMN IF NOT EXISTS publisher TEXT,
ADD COLUMN IF NOT EXISTS author_status TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS identity_verification_requested BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false NOT NULL;

UPDATE public.profiles
SET profile_completed = true
WHERE created_at < now()
  AND profile_completed = false;
