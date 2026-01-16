-- Add status column to user_follows for pending/accepted follow requests
ALTER TABLE public.user_follows 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted';

-- Update RLS policies to consider status for follower counts
-- Only count accepted follows in stats