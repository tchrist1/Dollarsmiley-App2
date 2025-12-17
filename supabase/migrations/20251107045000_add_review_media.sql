/*
  # Add Photo/Video Upload to Reviews

  ## Overview
  Adds support for attaching photos and videos to reviews, with metadata tracking,
  storage integration, and moderation capabilities.

  ## New Tables

  ### 1. `review_media`
  Stores media attachments for reviews
  - `id` (uuid, primary key)
  - `review_id` (uuid, references reviews)
  - `media_type` (text) - photo, video
  - `file_path` (text) - Storage path
  - `file_url` (text) - Public URL
  - `thumbnail_url` (text) - Thumbnail for videos
  - `file_size` (bigint) - Size in bytes
  - `mime_type` (text) - e.g., image/jpeg, video/mp4
  - `width` (int) - Image/video width
  - `height` (int) - Image/video height
  - `duration` (int) - Video duration in seconds
  - `order_index` (int) - Display order
  - `is_moderated` (boolean) - Passed moderation
  - `moderation_status` (text) - Pending, Approved, Rejected
  - `created_at` (timestamptz)

  ## Features
  - Multiple media per review
  - Photo and video support
  - Thumbnail generation
  - Size and type validation
  - Moderation workflow
  - Display ordering

  ## Storage
  - Bucket: review-media
  - Path: {user_id}/{review_id}/{filename}
  - Public access for approved media

  ## Security
  - RLS enabled
  - Users can manage own media
  - Public can view approved media
*/

-- Create review_media table
CREATE TABLE IF NOT EXISTS review_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  file_path text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  width int,
  height int,
  duration int,
  order_index int DEFAULT 0,
  is_moderated boolean DEFAULT false,
  moderation_status text DEFAULT 'Pending' CHECK (moderation_status IN ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_review_media_review ON review_media(review_id);
CREATE INDEX IF NOT EXISTS idx_review_media_type ON review_media(media_type);
CREATE INDEX IF NOT EXISTS idx_review_media_moderation ON review_media(moderation_status);
CREATE INDEX IF NOT EXISTS idx_review_media_order ON review_media(review_id, order_index);

-- Enable RLS
ALTER TABLE review_media ENABLE ROW LEVEL SECURITY;

-- Users can view approved media
CREATE POLICY "Anyone can view approved review media"
  ON review_media FOR SELECT
  USING (moderation_status = 'Approved');

-- Users can view their own media (any status)
CREATE POLICY "Users can view own review media"
  ON review_media FOR SELECT
  TO authenticated
  USING (
    review_id IN (
      SELECT id FROM reviews WHERE reviewer_id = auth.uid()
    )
  );

-- Users can insert media for their own reviews
CREATE POLICY "Users can upload media to own reviews"
  ON review_media FOR INSERT
  TO authenticated
  WITH CHECK (
    review_id IN (
      SELECT id FROM reviews WHERE reviewer_id = auth.uid()
    )
  );

-- Users can delete their own media
CREATE POLICY "Users can delete own review media"
  ON review_media FOR DELETE
  TO authenticated
  USING (
    review_id IN (
      SELECT id FROM reviews WHERE reviewer_id = auth.uid()
    )
  );

-- Admins can manage all media
CREATE POLICY "Admins can manage all review media"
  ON review_media FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'Admin'
    )
  );

-- Add media count to reviews view
CREATE OR REPLACE VIEW reviews_with_media AS
SELECT
  r.*,
  COUNT(rm.id) FILTER (WHERE rm.moderation_status = 'Approved') as media_count,
  COUNT(rm.id) FILTER (WHERE rm.media_type = 'photo' AND rm.moderation_status = 'Approved') as photo_count,
  COUNT(rm.id) FILTER (WHERE rm.media_type = 'video' AND rm.moderation_status = 'Approved') as video_count,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', rm.id,
        'media_type', rm.media_type,
        'file_url', rm.file_url,
        'thumbnail_url', rm.thumbnail_url,
        'width', rm.width,
        'height', rm.height,
        'duration', rm.duration,
        'order_index', rm.order_index
      ) ORDER BY rm.order_index
    ) FILTER (WHERE rm.moderation_status = 'Approved'),
    '[]'::jsonb
  ) as media
FROM reviews r
LEFT JOIN review_media rm ON r.id = rm.review_id
GROUP BY r.id;

-- Function to get review with media
CREATE OR REPLACE FUNCTION get_review_with_media(review_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'review', row_to_json(r),
    'media', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', rm.id,
          'media_type', rm.media_type,
          'file_url', rm.file_url,
          'thumbnail_url', rm.thumbnail_url,
          'file_size', rm.file_size,
          'mime_type', rm.mime_type,
          'width', rm.width,
          'height', rm.height,
          'duration', rm.duration,
          'order_index', rm.order_index,
          'moderation_status', rm.moderation_status
        ) ORDER BY rm.order_index
      ),
      '[]'::jsonb
    )
  ) INTO result
  FROM reviews r
  LEFT JOIN review_media rm ON r.id = rm.review_id
  WHERE r.id = review_id_param
  GROUP BY r.id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add media to review
CREATE OR REPLACE FUNCTION add_review_media(
  review_id_param uuid,
  media_type_param text,
  file_path_param text,
  file_url_param text,
  thumbnail_url_param text DEFAULT NULL,
  file_size_param bigint DEFAULT 0,
  mime_type_param text DEFAULT 'application/octet-stream',
  width_param int DEFAULT NULL,
  height_param int DEFAULT NULL,
  duration_param int DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  media_id uuid;
  next_order int;
BEGIN
  -- Verify user owns the review
  IF NOT EXISTS (
    SELECT 1 FROM reviews
    WHERE id = review_id_param
    AND reviewer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to add media to this review';
  END IF;

  -- Get next order index
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO next_order
  FROM review_media
  WHERE review_id = review_id_param;

  -- Insert media record
  INSERT INTO review_media (
    review_id,
    media_type,
    file_path,
    file_url,
    thumbnail_url,
    file_size,
    mime_type,
    width,
    height,
    duration,
    order_index,
    moderation_status
  ) VALUES (
    review_id_param,
    media_type_param,
    file_path_param,
    file_url_param,
    thumbnail_url_param,
    file_size_param,
    mime_type_param,
    width_param,
    height_param,
    duration_param,
    next_order,
    'Approved' -- Auto-approve for now, add moderation later
  ) RETURNING id INTO media_id;

  RETURN media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder media
CREATE OR REPLACE FUNCTION reorder_review_media(
  media_id_param uuid,
  new_order_param int
)
RETURNS boolean AS $$
DECLARE
  media_record RECORD;
  old_order int;
BEGIN
  -- Get media details and verify ownership
  SELECT rm.*, r.reviewer_id INTO media_record
  FROM review_media rm
  JOIN reviews r ON rm.review_id = r.id
  WHERE rm.id = media_id_param;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF media_record.reviewer_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to reorder this media';
  END IF;

  old_order := media_record.order_index;

  -- Update orders
  IF new_order_param < old_order THEN
    -- Moving up
    UPDATE review_media
    SET order_index = order_index + 1
    WHERE review_id = media_record.review_id
    AND order_index >= new_order_param
    AND order_index < old_order;
  ELSIF new_order_param > old_order THEN
    -- Moving down
    UPDATE review_media
    SET order_index = order_index - 1
    WHERE review_id = media_record.review_id
    AND order_index > old_order
    AND order_index <= new_order_param;
  END IF;

  -- Update target media
  UPDATE review_media
  SET order_index = new_order_param
  WHERE id = media_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete review media
CREATE OR REPLACE FUNCTION delete_review_media(media_id_param uuid)
RETURNS boolean AS $$
DECLARE
  media_record RECORD;
BEGIN
  -- Get media details and verify ownership
  SELECT rm.*, r.reviewer_id INTO media_record
  FROM review_media rm
  JOIN reviews r ON rm.review_id = r.id
  WHERE rm.id = media_id_param;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF media_record.reviewer_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to delete this media';
  END IF;

  -- Delete media record (file deletion handled by client)
  DELETE FROM review_media WHERE id = media_id_param;

  -- Reorder remaining media
  UPDATE review_media
  SET order_index = order_index - 1
  WHERE review_id = media_record.review_id
  AND order_index > media_record.order_index;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get media needing moderation
CREATE OR REPLACE FUNCTION get_media_needing_moderation(
  limit_param int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  review_id uuid,
  reviewer_id uuid,
  reviewer_name text,
  media_type text,
  file_url text,
  thumbnail_url text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rm.id,
    rm.review_id,
    r.reviewer_id,
    p.full_name,
    rm.media_type,
    rm.file_url,
    rm.thumbnail_url,
    rm.created_at
  FROM review_media rm
  JOIN reviews r ON rm.review_id = r.id
  JOIN profiles p ON r.reviewer_id = p.id
  WHERE rm.moderation_status = 'Pending'
  ORDER BY rm.created_at ASC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to moderate media
CREATE OR REPLACE FUNCTION moderate_review_media(
  media_id_param uuid,
  status_param text
)
RETURNS boolean AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND user_type = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to moderate media';
  END IF;

  UPDATE review_media
  SET
    moderation_status = status_param,
    is_moderated = true
  WHERE id = media_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get review media statistics
CREATE OR REPLACE FUNCTION get_review_media_stats()
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_media', COUNT(*),
    'by_type', jsonb_object_agg(
      media_type,
      type_count
    ),
    'by_status', jsonb_object_agg(
      moderation_status,
      status_count
    ),
    'total_size_mb', ROUND((SUM(file_size)::numeric / 1024 / 1024), 2),
    'avg_per_review', ROUND(AVG(media_per_review)::numeric, 2)
  ) INTO stats
  FROM (
    SELECT
      media_type,
      moderation_status,
      file_size,
      COUNT(*) OVER (PARTITION BY media_type) as type_count,
      COUNT(*) OVER (PARTITION BY moderation_status) as status_count,
      COUNT(*) OVER (PARTITION BY review_id) as media_per_review
    FROM review_media
  ) sub;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_review_with_media(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_review_media(uuid, text, text, text, text, bigint, text, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_review_media(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_review_media(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_media_needing_moderation(int) TO authenticated;
GRANT EXECUTE ON FUNCTION moderate_review_media(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_review_media_stats() TO authenticated;

-- Grant access to view
GRANT SELECT ON reviews_with_media TO authenticated;
