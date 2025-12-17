/*
  # Create Avatars Storage Bucket

  1. Storage Setup
    - Create `avatars` storage bucket
    - Configure public access for avatar images

  2. Notes
    - Max file size: 5MB
    - Supported formats: jpg, jpeg, png, webp, gif
    - RLS policies are managed through Supabase Storage configuration
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