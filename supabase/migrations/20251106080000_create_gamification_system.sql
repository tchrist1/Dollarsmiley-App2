/*
  # Create Gamification System

  1. New Tables
    - `user_levels` - Level definitions with XP requirements
    - `profile_gamification` - User XP, level, and stats
    - `achievements` - Achievement definitions
    - `profile_achievements` - User achievements earned
    - `xp_transactions` - XP gain/loss history

  2. Features
    - Experience points (XP) system
    - Level progression (1-50)
    - Achievement system with tiers
    - Activity streaks
    - Leaderboards
    - XP sources tracking
    - Automatic level up
    - Achievement notifications

  3. XP Sources
    - Complete booking: 50 XP
    - Receive 5-star review: 25 XP
    - Complete profile: 20 XP
    - First booking: 100 XP (bonus)
    - Verify identity: 50 XP
    - Daily login: 5 XP
    - Post job: 10 XP
    - Apply to job: 5 XP
    - Message sent: 2 XP
    - Profile view milestone: Variable

  4. Security
    - RLS policies for all tables
    - Admin-only achievement management
    - User can view own gamification data
*/

-- Create user_levels table
CREATE TABLE IF NOT EXISTS user_levels (
  level integer PRIMARY KEY CHECK (level >= 1 AND level <= 50),
  title text NOT NULL,
  xp_required bigint NOT NULL,
  perks jsonb DEFAULT '[]'::jsonb,
  badge_color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Create profile_gamification table
CREATE TABLE IF NOT EXISTS profile_gamification (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_level integer DEFAULT 1 REFERENCES user_levels(level),
  total_xp bigint DEFAULT 0,
  current_level_xp bigint DEFAULT 0,
  lifetime_xp bigint DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_activity_date date,
  bookings_completed integer DEFAULT 0,
  jobs_posted integer DEFAULT 0,
  reviews_received integer DEFAULT 0,
  five_star_reviews integer DEFAULT 0,
  profile_views integer DEFAULT 0,
  total_earnings numeric(10,2) DEFAULT 0,
  achievements_count integer DEFAULT 0,
  badges_count integer DEFAULT 0,
  rank_position integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  tier text NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  category text NOT NULL CHECK (category IN ('booking', 'social', 'profile', 'earnings', 'quality', 'milestone', 'special')),
  xp_reward integer DEFAULT 0,
  criteria jsonb NOT NULL,
  is_secret boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profile_achievements table
CREATE TABLE IF NOT EXISTS profile_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  progress jsonb DEFAULT '{}',
  is_new boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, achievement_id)
);

-- Create xp_transactions table
CREATE TABLE IF NOT EXISTS xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  xp_amount integer NOT NULL,
  source text NOT NULL,
  source_id uuid,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_gamification_level ON profile_gamification(current_level);
CREATE INDEX IF NOT EXISTS idx_profile_gamification_xp ON profile_gamification(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profile_gamification_streak ON profile_gamification(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_tier ON achievements(tier);
CREATE INDEX IF NOT EXISTS idx_profile_achievements_profile ON profile_achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_achievements_earned ON profile_achievements(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_profile ON xp_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_levels
CREATE POLICY "Anyone can view levels"
  ON user_levels FOR SELECT
  USING (true);

-- RLS Policies for profile_gamification
CREATE POLICY "Users can view own gamification"
  ON profile_gamification FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Anyone can view public gamification"
  ON profile_gamification FOR SELECT
  USING (true);

CREATE POLICY "System can update gamification"
  ON profile_gamification FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "System can insert gamification"
  ON profile_gamification FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- RLS Policies for achievements
CREATE POLICY "Anyone can view active achievements"
  ON achievements FOR SELECT
  USING (is_active = true AND is_secret = false);

CREATE POLICY "Users can view all achievements they earned"
  ON achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile_achievements
      WHERE profile_achievements.achievement_id = achievements.id
      AND profile_achievements.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage achievements"
  ON achievements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for profile_achievements
CREATE POLICY "Users can view own achievements"
  ON profile_achievements FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Anyone can view public achievements"
  ON profile_achievements FOR SELECT
  USING (true);

CREATE POLICY "System can insert achievements"
  ON profile_achievements FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- RLS Policies for xp_transactions
CREATE POLICY "Users can view own XP transactions"
  ON xp_transactions FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "System can insert XP transactions"
  ON xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Insert level definitions
INSERT INTO user_levels (level, title, xp_required, perks, badge_color) VALUES
  (1, 'Newcomer', 0, '["Access to basic features"]', '#94A3B8'),
  (2, 'Explorer', 100, '["Profile badge"]', '#94A3B8'),
  (3, 'Adventurer', 250, '["Priority support"]', '#94A3B8'),
  (4, 'Professional', 500, '["Featured in search"]', '#3B82F6'),
  (5, 'Expert', 1000, '["Custom profile theme"]', '#3B82F6'),
  (6, 'Master', 2000, '["Advanced analytics"]', '#3B82F6'),
  (7, 'Elite', 3500, '["VIP support"]', '#8B5CF6'),
  (8, 'Champion', 5500, '["Verified badge"]', '#8B5CF6'),
  (9, 'Legend', 8000, '["Premium features"]', '#8B5CF6'),
  (10, 'Hero', 11000, '["Exclusive perks"]', '#F59E0B'),
  (11, 'Titan', 15000, '["Priority placement"]', '#F59E0B'),
  (12, 'Guardian', 20000, '["Custom branding"]', '#F59E0B'),
  (13, 'Sentinel', 26000, '["API access"]', '#10B981'),
  (14, 'Protector', 33000, '["Bulk operations"]', '#10B981'),
  (15, 'Defender', 41000, '["Team accounts"]', '#10B981'),
  (16, 'Warrior', 50000, '["Advanced reporting"]', '#EF4444'),
  (17, 'Conqueror', 60000, '["White label"]', '#EF4444'),
  (18, 'Overlord', 71000, '["Dedicated support"]', '#EF4444'),
  (19, 'Sovereign', 83000, '["Custom integrations"]', '#EC4899'),
  (20, 'Emperor', 96000, '["Partner benefits"]', '#EC4899'),
  (21, 'Supreme', 110000, '["Revenue share program"]', '#EC4899'),
  (22, 'Divine', 125000, '["Exclusive events"]', '#6366F1'),
  (23, 'Celestial', 141000, '["Beta features"]', '#6366F1'),
  (24, 'Immortal', 158000, '["Advisory board"]', '#6366F1'),
  (25, 'Eternal', 176000, '["Custom solutions"]', '#14B8A6'),
  (26, 'Infinite', 195000, '["Enterprise features"]', '#14B8A6'),
  (27, 'Transcendent', 215000, '["Global recognition"]', '#14B8A6'),
  (28, 'Omnipotent', 236000, '["Hall of fame"]', '#F97316'),
  (29, 'Almighty', 258000, '["Lifetime benefits"]', '#F97316'),
  (30, 'Mythical', 281000, '["Legend status"]', '#F97316'),
  (31, 'Legendary', 305000, '["All perks unlocked"]', '#DC2626'),
  (32, 'Epic', 330000, '["Custom title"]', '#DC2626'),
  (33, 'Fabled', 356000, '["Profile showcase"]', '#DC2626'),
  (34, 'Renowned', 383000, '["Featured placement"]', '#7C3AED'),
  (35, 'Distinguished', 411000, '["Brand partnerships"]', '#7C3AED'),
  (36, 'Illustrious', 440000, '["Media features"]', '#7C3AED'),
  (37, 'Prestigious', 470000, '["Speaking opportunities"]', '#0891B2'),
  (38, 'Noble', 501000, '["Mentorship program"]', '#0891B2'),
  (39, 'Exalted', 533000, '["Advisory role"]', '#0891B2'),
  (40, 'Glorious', 566000, '["Profit sharing"]', '#EA580C'),
  (41, 'Magnificent', 600000, '["Equity options"]', '#EA580C'),
  (42, 'Majestic', 635000, '["Board nomination"]', '#EA580C'),
  (43, 'Grand', 671000, '["Company shares"]', '#BE123C'),
  (44, 'Supreme Leader', 708000, '["Executive perks"]', '#BE123C'),
  (45, 'Ultimate', 746000, '["Unlimited everything"]', '#BE123C'),
  (46, 'Perfect', 785000, '["VIP treatment"]', '#6D28D9'),
  (47, 'Flawless', 825000, '["Personal concierge"]', '#6D28D9'),
  (48, 'Peerless', 866000, '["Private events"]', '#6D28D9'),
  (49, 'Unrivaled', 908000, '["Legacy builder"]', '#047857'),
  (50, 'Absolute', 1000000, '["Platform owner status"]', '#047857')
ON CONFLICT (level) DO NOTHING;

-- Insert achievements
INSERT INTO achievements (slug, name, description, icon, tier, category, xp_reward, criteria) VALUES
  -- Booking Achievements
  ('first_booking', 'First Steps', 'Complete your first booking', 'calendar-check', 'bronze', 'booking', 100, '{"bookings_completed": 1}'),
  ('booking_veteran', 'Getting Started', 'Complete 5 bookings', 'calendar', 'silver', 'booking', 150, '{"bookings_completed": 5}'),
  ('booking_pro', 'Professional', 'Complete 25 bookings', 'briefcase', 'gold', 'booking', 300, '{"bookings_completed": 25}'),
  ('booking_master', 'Master Provider', 'Complete 100 bookings', 'award', 'platinum', 'booking', 500, '{"bookings_completed": 100}'),
  ('booking_legend', 'Legendary Service', 'Complete 500 bookings', 'crown', 'diamond', 'booking', 1000, '{"bookings_completed": 500}'),

  -- Quality Achievements
  ('five_star_debut', 'Five Star Debut', 'Receive your first 5-star review', 'star', 'bronze', 'quality', 50, '{"five_star_reviews": 1}'),
  ('quality_provider', 'Quality Provider', 'Maintain 4.8+ rating with 20+ reviews', 'shield-check', 'gold', 'quality', 250, '{"min_rating": 4.8, "min_reviews": 20}'),
  ('perfectionist', 'Perfectionist', 'Receive 50 five-star reviews', 'sparkles', 'platinum', 'quality', 400, '{"five_star_reviews": 50}'),
  ('flawless', 'Flawless Record', 'Maintain 5.0 rating with 100+ reviews', 'gem', 'diamond', 'quality', 800, '{"min_rating": 5.0, "min_reviews": 100}'),

  -- Earnings Achievements
  ('first_dollar', 'First Dollar', 'Earn your first dollar', 'dollar-sign', 'bronze', 'earnings', 25, '{"total_earnings": 1}'),
  ('side_hustle', 'Side Hustle', 'Earn $1,000', 'coins', 'silver', 'earnings', 100, '{"total_earnings": 1000}'),
  ('serious_business', 'Serious Business', 'Earn $10,000', 'trending-up', 'gold', 'earnings', 300, '{"total_earnings": 10000}'),
  ('entrepreneur', 'Entrepreneur', 'Earn $50,000', 'line-chart', 'platinum', 'earnings', 600, '{"total_earnings": 50000}'),
  ('mogul', 'Mogul', 'Earn $250,000', 'building', 'diamond', 'earnings', 1200, '{"total_earnings": 250000}'),

  -- Social Achievements
  ('social_butterfly', 'Social Butterfly', 'Receive 100 profile views', 'users', 'bronze', 'social', 50, '{"profile_views": 100}'),
  ('popular', 'Popular Provider', 'Receive 500 profile views', 'user-check', 'silver', 'social', 150, '{"profile_views": 500}'),
  ('influencer', 'Influencer', 'Receive 2,000 profile views', 'trending-up', 'gold', 'social', 300, '{"profile_views": 2000}'),
  ('celebrity', 'Celebrity Status', 'Receive 10,000 profile views', 'star', 'platinum', 'social', 600, '{"profile_views": 10000}'),

  -- Profile Achievements
  ('profile_complete', 'Profile Perfectionist', 'Complete 100% of your profile', 'user', 'bronze', 'profile', 50, '{"profile_completion": 100}'),
  ('verified_pro', 'Verified Professional', 'Complete ID and business verification', 'shield-check', 'silver', 'profile', 200, '{"verifications": ["identity", "business"]}'),
  ('super_verified', 'Super Verified', 'Complete all verification types', 'badge-check', 'gold', 'profile', 400, '{"verifications": ["identity", "business", "phone", "email", "background"]}'),

  -- Streak Achievements
  ('consistent', 'Consistent User', 'Maintain a 7-day activity streak', 'flame', 'bronze', 'milestone', 50, '{"current_streak": 7}'),
  ('dedicated', 'Dedicated User', 'Maintain a 30-day activity streak', 'fire', 'silver', 'milestone', 150, '{"current_streak": 30}'),
  ('unstoppable', 'Unstoppable', 'Maintain a 100-day activity streak', 'zap', 'gold', 'milestone', 400, '{"current_streak": 100}'),
  ('eternal_flame', 'Eternal Flame', 'Maintain a 365-day activity streak', 'flame', 'diamond', 'milestone', 1000, '{"current_streak": 365}'),

  -- Milestone Achievements
  ('rising_star', 'Rising Star', 'Reach level 10', 'star', 'silver', 'milestone', 200, '{"current_level": 10}'),
  ('elite_member', 'Elite Member', 'Reach level 25', 'crown', 'gold', 'milestone', 500, '{"current_level": 25}'),
  ('legendary_status', 'Legendary Status', 'Reach level 50', 'trophy', 'diamond', 'milestone', 2000, '{"current_level": 50}'),

  -- Special Achievements
  ('early_adopter', 'Early Adopter', 'Join during beta period', 'rocket', 'platinum', 'special', 500, '{"is_early_adopter": true}'),
  ('platform_hero', 'Platform Hero', 'Help 100+ customers', 'heart', 'diamond', 'special', 800, '{"customers_helped": 100}'),
  ('community_leader', 'Community Leader', 'Be featured in top 10 leaderboard', 'trophy', 'diamond', 'special', 1000, '{"rank_position": 10}')
ON CONFLICT (slug) DO NOTHING;

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(
  p_profile_id uuid,
  p_xp_amount integer,
  p_source text,
  p_source_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_level integer;
  v_new_total_xp bigint;
  v_next_level_xp bigint;
BEGIN
  -- Insert XP transaction
  INSERT INTO xp_transactions (profile_id, xp_amount, source, source_id, description)
  VALUES (p_profile_id, p_xp_amount, p_source, p_source_id, p_description);

  -- Initialize gamification if not exists
  INSERT INTO profile_gamification (profile_id)
  VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;

  -- Update gamification stats
  UPDATE profile_gamification
  SET
    total_xp = total_xp + p_xp_amount,
    current_level_xp = current_level_xp + p_xp_amount,
    lifetime_xp = lifetime_xp + p_xp_amount,
    updated_at = now()
  WHERE profile_id = p_profile_id
  RETURNING current_level, total_xp INTO v_current_level, v_new_total_xp;

  -- Check for level up
  SELECT xp_required INTO v_next_level_xp
  FROM user_levels
  WHERE level = v_current_level + 1;

  IF v_next_level_xp IS NOT NULL AND v_new_total_xp >= v_next_level_xp THEN
    PERFORM level_up_user(p_profile_id);
  END IF;

  -- Check for achievements
  PERFORM check_achievements(p_profile_id);
END;
$$;

-- Function to level up user
CREATE OR REPLACE FUNCTION level_up_user(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_level integer;
  v_level_title text;
BEGIN
  -- Increment level
  UPDATE profile_gamification
  SET
    current_level = current_level + 1,
    current_level_xp = total_xp - (SELECT xp_required FROM user_levels WHERE level = current_level + 1),
    updated_at = now()
  WHERE profile_id = p_profile_id
  RETURNING current_level INTO v_new_level;

  -- Get level title
  SELECT title INTO v_level_title
  FROM user_levels
  WHERE level = v_new_level;

  -- Send notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_profile_id,
    'System',
    'Level Up!',
    format('Congratulations! You''ve reached level %s: %s', v_new_level, v_level_title),
    jsonb_build_object('level', v_new_level, 'title', v_level_title)
  );
END;
$$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_achievement RECORD;
  v_gamification RECORD;
  v_meets_criteria boolean;
BEGIN
  -- Get user's gamification stats
  SELECT * INTO v_gamification
  FROM profile_gamification
  WHERE profile_id = p_profile_id;

  -- Check each achievement
  FOR v_achievement IN
    SELECT a.*
    FROM achievements a
    WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM profile_achievements pa
      WHERE pa.profile_id = p_profile_id
      AND pa.achievement_id = a.id
    )
  LOOP
    v_meets_criteria := true;

    -- Check criteria (simplified - extend for production)
    IF v_achievement.criteria ? 'bookings_completed' THEN
      IF v_gamification.bookings_completed < (v_achievement.criteria->>'bookings_completed')::integer THEN
        v_meets_criteria := false;
      END IF;
    END IF;

    IF v_achievement.criteria ? 'five_star_reviews' THEN
      IF v_gamification.five_star_reviews < (v_achievement.criteria->>'five_star_reviews')::integer THEN
        v_meets_criteria := false;
      END IF;
    END IF;

    IF v_achievement.criteria ? 'current_level' THEN
      IF v_gamification.current_level < (v_achievement.criteria->>'current_level')::integer THEN
        v_meets_criteria := false;
      END IF;
    END IF;

    IF v_achievement.criteria ? 'current_streak' THEN
      IF v_gamification.current_streak < (v_achievement.criteria->>'current_streak')::integer THEN
        v_meets_criteria := false;
      END IF;
    END IF;

    -- Award achievement if criteria met
    IF v_meets_criteria THEN
      INSERT INTO profile_achievements (profile_id, achievement_id)
      VALUES (p_profile_id, v_achievement.id);

      -- Award XP
      IF v_achievement.xp_reward > 0 THEN
        PERFORM award_xp(
          p_profile_id,
          v_achievement.xp_reward,
          'achievement',
          v_achievement.id,
          'Achievement unlocked: ' || v_achievement.name
        );
      END IF;

      -- Update achievement count
      UPDATE profile_gamification
      SET achievements_count = achievements_count + 1
      WHERE profile_id = p_profile_id;

      -- Send notification
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        p_profile_id,
        'System',
        'Achievement Unlocked!',
        v_achievement.name || ': ' || v_achievement.description,
        jsonb_build_object(
          'achievement_id', v_achievement.id,
          'achievement_name', v_achievement.name,
          'xp_reward', v_achievement.xp_reward
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- Function to update activity streak
CREATE OR REPLACE FUNCTION update_activity_streak(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_activity_date date;
  v_today date := CURRENT_DATE;
BEGIN
  -- Get last activity date
  SELECT last_activity_date INTO v_last_activity_date
  FROM profile_gamification
  WHERE profile_id = p_profile_id;

  -- Initialize if null
  IF v_last_activity_date IS NULL THEN
    UPDATE profile_gamification
    SET
      current_streak = 1,
      longest_streak = 1,
      last_activity_date = v_today
    WHERE profile_id = p_profile_id;
    RETURN;
  END IF;

  -- Skip if already updated today
  IF v_last_activity_date = v_today THEN
    RETURN;
  END IF;

  -- Check if streak continues (yesterday)
  IF v_last_activity_date = v_today - INTERVAL '1 day' THEN
    UPDATE profile_gamification
    SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_activity_date = v_today
    WHERE profile_id = p_profile_id;

    -- Award daily login XP
    PERFORM award_xp(p_profile_id, 5, 'daily_login', NULL, 'Daily login bonus');
  ELSE
    -- Streak broken, reset to 1
    UPDATE profile_gamification
    SET
      current_streak = 1,
      last_activity_date = v_today
    WHERE profile_id = p_profile_id;
  END IF;

  -- Check streak achievements
  PERFORM check_achievements(p_profile_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;
GRANT EXECUTE ON FUNCTION level_up_user TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION update_activity_streak TO authenticated;
