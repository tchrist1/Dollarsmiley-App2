/*
  # Content Analytics System

  1. New Tables
    - content_analytics_daily - Daily content performance metrics
    - post_performance - Individual post performance tracking
    - content_engagement_trends - Engagement trends over time
    - viral_content_tracker - Track viral/trending content
    - user_content_metrics - User content creation metrics

  2. Features
    - Post views, likes, comments, shares tracking
    - Engagement rate calculations
    - Viral content detection
    - User content performance
    - Trending content identification
    - Content type analysis

  3. Security
    - RLS policies for privacy
    - Users can view own content metrics
    - Admins can view all analytics
*/

-- Create content_analytics_daily table
CREATE TABLE IF NOT EXISTS content_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_posts integer DEFAULT 0,
  total_views integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  avg_engagement_rate numeric(5, 2) DEFAULT 0,
  unique_authors integer DEFAULT 0,
  unique_viewers integer DEFAULT 0,
  posts_with_media integer DEFAULT 0,
  posts_with_location integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create post_performance table
CREATE TABLE IF NOT EXISTS post_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  engagement_rate numeric(5, 2) DEFAULT 0,
  reach_count integer DEFAULT 0,
  viral_score numeric(10, 2) DEFAULT 0,
  is_trending boolean DEFAULT false,
  peak_engagement_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(post_id)
);

-- Create content_engagement_trends table
CREATE TABLE IF NOT EXISTS content_engagement_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  hour_of_day integer NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  posts_created integer DEFAULT 0,
  total_engagement integer DEFAULT 0,
  avg_engagement_rate numeric(5, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, hour_of_day)
);

-- Create viral_content_tracker table
CREATE TABLE IF NOT EXISTS viral_content_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  detected_at timestamptz DEFAULT now(),
  viral_score numeric(10, 2) DEFAULT 0,
  engagement_velocity numeric(10, 2) DEFAULT 0,
  peak_engagement_hour integer,
  total_reach integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create user_content_metrics table
CREATE TABLE IF NOT EXISTS user_content_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  posts_created integer DEFAULT 0,
  total_views integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  avg_engagement_rate numeric(5, 2) DEFAULT 0,
  best_performing_post_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_content_analytics_daily_date ON content_analytics_daily(date DESC);
CREATE INDEX idx_post_performance_post ON post_performance(post_id);
CREATE INDEX idx_post_performance_author ON post_performance(author_id, created_at DESC);
CREATE INDEX idx_post_performance_trending ON post_performance(is_trending, viral_score DESC);
CREATE INDEX idx_content_engagement_trends_date ON content_engagement_trends(date DESC, hour_of_day);
CREATE INDEX idx_viral_content_post ON viral_content_tracker(post_id);
CREATE INDEX idx_viral_content_detected ON viral_content_tracker(detected_at DESC);
CREATE INDEX idx_user_content_metrics_user ON user_content_metrics(user_id, date DESC);
CREATE INDEX idx_user_content_metrics_date ON user_content_metrics(date DESC);

-- Enable RLS
ALTER TABLE content_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_engagement_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_content_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_analytics_daily
CREATE POLICY "Admins can view content analytics"
  ON content_analytics_daily FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage content analytics"
  ON content_analytics_daily FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for post_performance
CREATE POLICY "Users can view own post performance"
  ON post_performance FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Admins can view all post performance"
  ON post_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage post performance"
  ON post_performance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for content_engagement_trends
CREATE POLICY "Admins can view engagement trends"
  ON content_engagement_trends FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage engagement trends"
  ON content_engagement_trends FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for viral_content_tracker
CREATE POLICY "Users can view own viral content"
  ON viral_content_tracker FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Admins can view all viral content"
  ON viral_content_tracker FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage viral content tracker"
  ON viral_content_tracker FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_content_metrics
CREATE POLICY "Users can view own content metrics"
  ON user_content_metrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user content metrics"
  ON user_content_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage user content metrics"
  ON user_content_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update post performance metrics
CREATE OR REPLACE FUNCTION update_post_performance(p_post_id uuid)
RETURNS void AS $$
DECLARE
  v_author_id uuid;
  v_views integer;
  v_likes integer;
  v_comments integer;
  v_shares integer;
  v_engagement_rate numeric;
  v_viral_score numeric;
BEGIN
  -- Get post author
  SELECT author_id INTO v_author_id
  FROM community_posts
  WHERE id = p_post_id;

  -- Count engagement metrics
  SELECT
    COALESCE((SELECT views FROM post_views WHERE post_id = p_post_id), 0),
    COALESCE((SELECT COUNT(*) FROM post_likes WHERE post_id = p_post_id), 0),
    COALESCE((SELECT COUNT(*) FROM post_comments WHERE post_id = p_post_id), 0),
    COALESCE((SELECT COUNT(*) FROM post_shares WHERE post_id = p_post_id), 0)
  INTO v_views, v_likes, v_comments, v_shares;

  -- Calculate engagement rate
  IF v_views > 0 THEN
    v_engagement_rate := ((v_likes + v_comments + v_shares)::numeric / v_views * 100)::numeric(5,2);
  ELSE
    v_engagement_rate := 0;
  END IF;

  -- Calculate viral score (weighted engagement)
  v_viral_score := (v_likes * 1.0) + (v_comments * 2.0) + (v_shares * 3.0);

  -- Insert or update post performance
  INSERT INTO post_performance (
    post_id, author_id, views_count, likes_count, comments_count,
    shares_count, engagement_rate, viral_score, is_trending
  ) VALUES (
    p_post_id, v_author_id, v_views, v_likes, v_comments,
    v_shares, v_engagement_rate, v_viral_score,
    (v_viral_score > 100 AND v_engagement_rate > 5)
  )
  ON CONFLICT (post_id) DO UPDATE SET
    views_count = EXCLUDED.views_count,
    likes_count = EXCLUDED.likes_count,
    comments_count = EXCLUDED.comments_count,
    shares_count = EXCLUDED.shares_count,
    engagement_rate = EXCLUDED.engagement_rate,
    viral_score = EXCLUDED.viral_score,
    is_trending = EXCLUDED.is_trending,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate daily content analytics
CREATE OR REPLACE FUNCTION calculate_daily_content_analytics(p_date date)
RETURNS void AS $$
DECLARE
  v_total_posts integer;
  v_total_views integer;
  v_total_likes integer;
  v_total_comments integer;
  v_total_shares integer;
  v_avg_engagement numeric;
  v_unique_authors integer;
  v_posts_with_media integer;
  v_posts_with_location integer;
BEGIN
  -- Calculate metrics
  SELECT
    COUNT(*) as posts,
    COALESCE(SUM(pp.views_count), 0) as views,
    COALESCE(SUM(pp.likes_count), 0) as likes,
    COALESCE(SUM(pp.comments_count), 0) as comments,
    COALESCE(SUM(pp.shares_count), 0) as shares,
    COALESCE(AVG(pp.engagement_rate), 0) as avg_eng,
    COUNT(DISTINCT cp.author_id) as authors,
    COUNT(*) FILTER (WHERE cp.media_urls IS NOT NULL AND array_length(cp.media_urls, 1) > 0) as media,
    COUNT(*) FILTER (WHERE cp.location IS NOT NULL) as location
  INTO
    v_total_posts, v_total_views, v_total_likes, v_total_comments,
    v_total_shares, v_avg_engagement, v_unique_authors,
    v_posts_with_media, v_posts_with_location
  FROM community_posts cp
  LEFT JOIN post_performance pp ON pp.post_id = cp.id
  WHERE cp.created_at::date = p_date;

  -- Insert or update daily analytics
  INSERT INTO content_analytics_daily (
    date, total_posts, total_views, total_likes, total_comments,
    total_shares, avg_engagement_rate, unique_authors,
    posts_with_media, posts_with_location
  ) VALUES (
    p_date, v_total_posts, v_total_views, v_total_likes, v_total_comments,
    v_total_shares, v_avg_engagement, v_unique_authors,
    v_posts_with_media, v_posts_with_location
  )
  ON CONFLICT (date) DO UPDATE SET
    total_posts = EXCLUDED.total_posts,
    total_views = EXCLUDED.total_views,
    total_likes = EXCLUDED.total_likes,
    total_comments = EXCLUDED.total_comments,
    total_shares = EXCLUDED.total_shares,
    avg_engagement_rate = EXCLUDED.avg_engagement_rate,
    unique_authors = EXCLUDED.unique_authors,
    posts_with_media = EXCLUDED.posts_with_media,
    posts_with_location = EXCLUDED.posts_with_location,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get content trends
CREATE OR REPLACE FUNCTION get_content_trends(p_days integer DEFAULT 30)
RETURNS TABLE (
  date date,
  total_posts integer,
  total_engagement integer,
  avg_engagement_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cad.date,
    cad.total_posts,
    (cad.total_likes + cad.total_comments + cad.total_shares) as total_engagement,
    cad.avg_engagement_rate
  FROM content_analytics_daily cad
  WHERE cad.date >= CURRENT_DATE - p_days
  ORDER BY cad.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending posts
CREATE OR REPLACE FUNCTION get_trending_posts(p_limit integer DEFAULT 10)
RETURNS TABLE (
  post_id uuid,
  author_id uuid,
  author_name text,
  content text,
  viral_score numeric,
  engagement_rate numeric,
  total_engagement integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.post_id,
    pp.author_id,
    p.full_name as author_name,
    cp.content,
    pp.viral_score,
    pp.engagement_rate,
    (pp.likes_count + pp.comments_count + pp.shares_count) as total_engagement
  FROM post_performance pp
  JOIN community_posts cp ON cp.id = pp.post_id
  JOIN profiles p ON p.id = pp.author_id
  WHERE pp.is_trending = true
  ORDER BY pp.viral_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user content performance summary
CREATE OR REPLACE FUNCTION get_user_content_summary(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_posts', COALESCE(SUM(posts_created), 0),
    'total_views', COALESCE(SUM(total_views), 0),
    'total_likes', COALESCE(SUM(total_likes), 0),
    'total_comments', COALESCE(SUM(total_comments), 0),
    'total_shares', COALESCE(SUM(total_shares), 0),
    'avg_engagement_rate', COALESCE(AVG(avg_engagement_rate), 0),
    'best_post_id', (
      SELECT best_performing_post_id
      FROM user_content_metrics
      WHERE user_id = p_user_id
      ORDER BY avg_engagement_rate DESC
      LIMIT 1
    )
  ) INTO v_summary
  FROM user_content_metrics
  WHERE user_id = p_user_id
    AND date >= CURRENT_DATE - p_days;

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect viral content
CREATE OR REPLACE FUNCTION detect_viral_content()
RETURNS void AS $$
BEGIN
  INSERT INTO viral_content_tracker (
    post_id, author_id, viral_score, engagement_velocity, total_reach
  )
  SELECT
    pp.post_id,
    pp.author_id,
    pp.viral_score,
    pp.engagement_rate,
    pp.reach_count
  FROM post_performance pp
  WHERE pp.viral_score > 100
    AND pp.engagement_rate > 5
    AND NOT EXISTS (
      SELECT 1 FROM viral_content_tracker vct
      WHERE vct.post_id = pp.post_id
    )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get engagement by time of day
CREATE OR REPLACE FUNCTION get_engagement_by_hour(p_days integer DEFAULT 7)
RETURNS TABLE (
  hour_of_day integer,
  avg_engagement numeric,
  post_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cet.hour_of_day,
    AVG(cet.avg_engagement_rate)::numeric(5,2) as avg_engagement,
    SUM(cet.posts_created)::bigint as post_count
  FROM content_engagement_trends cet
  WHERE cet.date >= CURRENT_DATE - p_days
  GROUP BY cet.hour_of_day
  ORDER BY cet.hour_of_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top performing content types
CREATE OR REPLACE FUNCTION get_top_content_types(p_days integer DEFAULT 30)
RETURNS TABLE (
  content_type text,
  post_count bigint,
  avg_engagement_rate numeric,
  total_engagement bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN array_length(cp.media_urls, 1) > 0 THEN 'media'
      WHEN cp.location IS NOT NULL THEN 'location'
      ELSE 'text'
    END as content_type,
    COUNT(*)::bigint as post_count,
    AVG(pp.engagement_rate)::numeric(5,2) as avg_engagement_rate,
    SUM(pp.likes_count + pp.comments_count + pp.shares_count)::bigint as total_engagement
  FROM community_posts cp
  LEFT JOIN post_performance pp ON pp.post_id = cp.id
  WHERE cp.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY content_type
  ORDER BY avg_engagement_rate DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE content_analytics_daily IS 'Daily aggregated content performance metrics';
COMMENT ON TABLE post_performance IS 'Individual post performance tracking and viral detection';
COMMENT ON TABLE content_engagement_trends IS 'Engagement trends by time of day';
COMMENT ON TABLE viral_content_tracker IS 'Track viral and trending content';
COMMENT ON TABLE user_content_metrics IS 'User-specific content creation metrics';

COMMENT ON FUNCTION update_post_performance IS 'Calculate and update performance metrics for a post';
COMMENT ON FUNCTION calculate_daily_content_analytics IS 'Calculate daily content analytics';
COMMENT ON FUNCTION get_content_trends IS 'Get content creation and engagement trends';
COMMENT ON FUNCTION get_trending_posts IS 'Get currently trending posts';
COMMENT ON FUNCTION get_user_content_summary IS 'Get content performance summary for a user';
COMMENT ON FUNCTION detect_viral_content IS 'Detect and track viral content';
COMMENT ON FUNCTION get_engagement_by_hour IS 'Get engagement patterns by hour of day';
COMMENT ON FUNCTION get_top_content_types IS 'Get performance by content type';
