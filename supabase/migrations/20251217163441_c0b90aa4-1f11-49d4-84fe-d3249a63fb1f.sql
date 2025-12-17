-- Create book_authors table for collaboration
CREATE TABLE public.book_authors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ebook_id, user_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.book_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for book_authors
CREATE POLICY "Users can view book authors for their books or public books"
ON public.book_authors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = book_authors.ebook_id 
    AND (ebooks.user_id = auth.uid() OR ebooks.is_public = true)
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Book owners can add authors"
ON public.book_authors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = book_authors.ebook_id 
    AND ebooks.user_id = auth.uid()
  )
);

CREATE POLICY "Book owners can update author status"
ON public.book_authors FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = book_authors.ebook_id 
    AND ebooks.user_id = auth.uid()
  )
  OR (user_id = auth.uid() AND status = 'pending')
);

CREATE POLICY "Book owners can remove authors"
ON public.book_authors FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = book_authors.ebook_id 
    AND ebooks.user_id = auth.uid()
  )
);

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- Update ebooks RLS to allow collaborators to edit
DROP POLICY IF EXISTS "Users can update own ebooks" ON public.ebooks;
CREATE POLICY "Users can update own ebooks or as accepted collaborator"
ON public.ebooks FOR UPDATE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.book_authors 
    WHERE book_authors.ebook_id = ebooks.id 
    AND book_authors.user_id = auth.uid() 
    AND book_authors.status = 'accepted'
  )
);

-- Update chapters RLS to allow collaborators to edit
DROP POLICY IF EXISTS "Users can view chapters of their ebooks" ON public.chapters;
CREATE POLICY "Users can view chapters of their ebooks or as collaborator"
ON public.chapters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = chapters.ebook_id 
    AND (
      ebooks.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.book_authors 
        WHERE book_authors.ebook_id = ebooks.id 
        AND book_authors.user_id = auth.uid() 
        AND book_authors.status = 'accepted'
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can update chapters of their ebooks" ON public.chapters;
CREATE POLICY "Users can update chapters of their ebooks or as collaborator"
ON public.chapters FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = chapters.ebook_id 
    AND (
      ebooks.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.book_authors 
        WHERE book_authors.ebook_id = ebooks.id 
        AND book_authors.user_id = auth.uid() 
        AND book_authors.status = 'accepted'
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can create chapters for their ebooks" ON public.chapters;
CREATE POLICY "Users can create chapters for their ebooks or as collaborator"
ON public.chapters FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = chapters.ebook_id 
    AND (
      ebooks.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.book_authors 
        WHERE book_authors.ebook_id = ebooks.id 
        AND book_authors.user_id = auth.uid() 
        AND book_authors.status = 'accepted'
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can delete chapters of their ebooks" ON public.chapters;
CREATE POLICY "Users can delete chapters of their ebooks or as collaborator"
ON public.chapters FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ebooks 
    WHERE ebooks.id = chapters.ebook_id 
    AND (
      ebooks.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.book_authors 
        WHERE book_authors.ebook_id = ebooks.id 
        AND book_authors.user_id = auth.uid() 
        AND book_authors.status = 'accepted'
      )
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_book_authors_ebook_id ON public.book_authors(ebook_id);
CREATE INDEX idx_book_authors_user_id ON public.book_authors(user_id);
CREATE INDEX idx_book_authors_status ON public.book_authors(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);