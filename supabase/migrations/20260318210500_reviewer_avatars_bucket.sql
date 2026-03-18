-- =============================================================================
-- ValidaMabuku: Reviewer Avatars Storage Bucket
-- =============================================================================

-- Create a public storage bucket for reviewer profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('reviewer-avatars', 'reviewer-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Reviewers can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reviewer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update (overwrite) their own avatar
CREATE POLICY "Reviewers can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reviewer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Reviewers can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reviewer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'reviewer-avatars');
