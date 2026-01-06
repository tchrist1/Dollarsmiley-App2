/*
  # Create Listing Photos Storage Bucket

  1. Storage Setup
    - Create `listing-photos` storage bucket for service listing images
    - Configure public access for listing photos
    - Set file size limit to 5MB per photo
    - Allow common image formats: jpg, jpeg, png, webp, gif

  2. Security
    - Users can upload photos to their own listings folder
    - Everyone can view public listing photos
*/

-- Create the listing-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;