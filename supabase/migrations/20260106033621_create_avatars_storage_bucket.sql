/*
  # Create Avatars Storage Bucket

  1. Storage Setup
    - Create `avatars` storage bucket for user profile photos
    - Configure public access for avatar images
    - Set file size limit to 5MB
    - Allow common image formats: jpg, jpeg, png, webp, gif

  2. Notes
    - Bucket is public for read access
    - RLS policies are managed by Supabase Storage automatically
    - Users can upload to their own folders via authenticated requests
*/

-- Create the avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;