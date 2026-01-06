/*
  # Create Listing Photos Storage Policies

  1. Security Policies
    - Authenticated users can upload photos to their listings folder
    - Authenticated users can update their own listing photos
    - Authenticated users can delete their own listing photos
    - Everyone can view listing photos (public read)
*/

-- Policy: Authenticated users can upload listing photos to any path
CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-photos');

-- Policy: Authenticated users can update their own listing photos
CREATE POLICY "Authenticated users can update listing photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'listing-photos');

-- Policy: Authenticated users can delete their own listing photos
CREATE POLICY "Authenticated users can delete listing photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'listing-photos');

-- Policy: Everyone can view listing photos (public bucket)
CREATE POLICY "Public listing photos are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-photos');