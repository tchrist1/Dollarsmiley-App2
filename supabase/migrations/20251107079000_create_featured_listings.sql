/*
  # Create Featured Listings System

  1. New Tables
    - `featured_listings`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to service_listings)
      - `user_id` (uuid, foreign key to profiles)
      - `starts_at` (timestamptz, when feature period starts)
      - `ends_at` (timestamptz, when feature period ends)
      - `status` (text, pending/active/expired)
      - `payment_intent_id` (text, Stripe payment intent)
      - `amount_paid` (numeric, amount paid for featuring)
      - `impressions` (integer, view count)
      - `clicks` (integer, click count)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `featured_listings` table
    - Add policies for users to manage their own featured listings
    - Add policies for public to view active featured listings

  3. Functions
    - Function to increment impressions
    - Function to increment clicks
    - Function to auto-expire featured listings
    - Function to get active featured listings
*/

-- Create featured_listings table
CREATE TABLE IF NOT EXISTS featured_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'active', 'expired')),
  payment_intent_id text,
  amount_paid numeric(10, 2) NOT NULL,
  impressions integer DEFAULT 0 NOT NULL,
  clicks integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own featured listings"
  ON featured_listings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view active featured listings"
  ON featured_listings
  FOR SELECT
  TO public
  USING (status = 'active' AND starts_at <= now() AND ends_at >= now());

CREATE POLICY "Users can insert own featured listings"
  ON featured_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own featured listings"
  ON featured_listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_featured_listings_listing_id
  ON featured_listings(listing_id);

CREATE INDEX IF NOT EXISTS idx_featured_listings_user_id
  ON featured_listings(user_id);

CREATE INDEX IF NOT EXISTS idx_featured_listings_status
  ON featured_listings(status);

CREATE INDEX IF NOT EXISTS idx_featured_listings_dates
  ON featured_listings(starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_featured_listings_active
  ON featured_listings(status, starts_at, ends_at)
  WHERE status = 'active';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_featured_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_featured_listings_updated_at_trigger ON featured_listings;
CREATE TRIGGER update_featured_listings_updated_at_trigger
  BEFORE UPDATE ON featured_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_listings_updated_at();

-- Create function to increment impressions
CREATE OR REPLACE FUNCTION increment_featured_impressions(p_featured_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE featured_listings
  SET impressions = impressions + 1
  WHERE id = p_featured_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment clicks
CREATE OR REPLACE FUNCTION increment_featured_clicks(p_featured_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE featured_listings
  SET clicks = clicks + 1
  WHERE id = p_featured_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to expire featured listings
CREATE OR REPLACE FUNCTION expire_featured_listings()
RETURNS void AS $$
BEGIN
  UPDATE featured_listings
  SET status = 'expired'
  WHERE status = 'active'
    AND ends_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get active featured listings
CREATE OR REPLACE FUNCTION get_active_featured_listings(
  p_category_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  listing_id uuid,
  listing jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions integer,
  clicks integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fl.id,
    fl.listing_id,
    jsonb_build_object(
      'id', sl.id,
      'title', sl.title,
      'description', sl.description,
      'price', sl.price,
      'category', jsonb_build_object(
        'id', c.id,
        'name', c.name
      ),
      'provider', jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'average_rating', p.average_rating
      )
    ) as listing,
    fl.starts_at,
    fl.ends_at,
    fl.impressions,
    fl.clicks
  FROM featured_listings fl
  JOIN service_listings sl ON sl.id = fl.listing_id
  JOIN categories c ON c.id = sl.category_id
  JOIN profiles p ON p.id = sl.user_id
  WHERE fl.status = 'active'
    AND fl.starts_at <= now()
    AND fl.ends_at >= now()
    AND sl.status = 'Active'
    AND (p_category_id IS NULL OR sl.category_id = p_category_id)
  ORDER BY fl.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for featured listings with stats
CREATE OR REPLACE VIEW featured_listings_stats AS
SELECT
  fl.id,
  fl.listing_id,
  fl.user_id,
  fl.starts_at,
  fl.ends_at,
  fl.status,
  fl.amount_paid,
  fl.impressions,
  fl.clicks,
  CASE
    WHEN fl.impressions > 0 THEN (fl.clicks::float / fl.impressions::float) * 100
    ELSE 0
  END as ctr,
  CASE
    WHEN fl.clicks > 0 THEN fl.amount_paid / fl.clicks
    ELSE 0
  END as cost_per_click,
  EXTRACT(EPOCH FROM (fl.ends_at - now())) / 86400 as days_remaining,
  sl.title as listing_title,
  c.name as category_name
FROM featured_listings fl
JOIN service_listings sl ON sl.id = fl.listing_id
JOIN categories c ON c.id = sl.category_id
ORDER BY fl.created_at DESC;

-- Grant access to view
GRANT SELECT ON featured_listings_stats TO authenticated;

-- Create function to check if listing can be featured
CREATE OR REPLACE FUNCTION can_feature_listing(
  p_user_id uuid,
  p_listing_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_listing_exists boolean;
  v_already_featured boolean;
  v_limit_reached boolean;
  v_usage_data jsonb;
BEGIN
  -- Check if listing exists and belongs to user
  SELECT EXISTS (
    SELECT 1
    FROM service_listings
    WHERE id = p_listing_id
      AND user_id = p_user_id
      AND status = 'Active'
  ) INTO v_listing_exists;

  IF NOT v_listing_exists THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Listing not found or not active'
    );
  END IF;

  -- Check if listing is already featured
  SELECT EXISTS (
    SELECT 1
    FROM featured_listings
    WHERE listing_id = p_listing_id
      AND status = 'active'
      AND ends_at >= now()
  ) INTO v_already_featured;

  IF v_already_featured THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Listing is already featured'
    );
  END IF;

  -- Check usage limits
  v_usage_data := check_usage_limit(p_user_id, 'featured_listings', 1);

  IF (v_usage_data->>'exceeded')::boolean THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Featured listing limit reached. Upgrade your plan to continue.'
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification trigger for expiring featured listings
CREATE OR REPLACE FUNCTION notify_featured_expiring()
RETURNS void AS $$
BEGIN
  -- Notify users 1 day before expiration
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT
    fl.user_id,
    'featured_expiring',
    'Featured Listing Expiring Soon',
    'Your featured listing for "' || sl.title || '" will expire in 1 day.',
    jsonb_build_object(
      'featured_id', fl.id,
      'listing_id', fl.listing_id,
      'expires_at', fl.ends_at
    )
  FROM featured_listings fl
  JOIN service_listings sl ON sl.id = fl.listing_id
  WHERE fl.status = 'active'
    AND fl.ends_at BETWEEN now() AND now() + interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = fl.user_id
        AND type = 'featured_expiring'
        AND (data->>'featured_id')::uuid = fl.id
        AND created_at > now() - interval '2 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add featured badge to service_listings view
CREATE OR REPLACE VIEW service_listings_with_featured AS
SELECT
  sl.*,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM featured_listings fl
      WHERE fl.listing_id = sl.id
        AND fl.status = 'active'
        AND fl.starts_at <= now()
        AND fl.ends_at >= now()
    ) THEN true
    ELSE false
  END as is_featured,
  (
    SELECT fl.ends_at
    FROM featured_listings fl
    WHERE fl.listing_id = sl.id
      AND fl.status = 'active'
      AND fl.starts_at <= now()
      AND fl.ends_at >= now()
    ORDER BY fl.ends_at DESC
    LIMIT 1
  ) as featured_until
FROM service_listings sl;

-- Grant access to view
GRANT SELECT ON service_listings_with_featured TO authenticated, anon;
