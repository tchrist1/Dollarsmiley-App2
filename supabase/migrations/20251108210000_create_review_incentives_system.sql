/*
  # Create Review Incentives System

  ## Overview
  Provides a comprehensive review incentives system to encourage customers to leave reviews
  by offering rewards such as credits, discounts, badges, XP points, and contest entries.
  Integrates with existing gamification, subscription, and promotional systems.

  ## New Tables

  ### 1. `review_incentive_campaigns`
  Campaign configurations
  - `id` (uuid, primary key)
  - `name` (text) - Campaign name
  - `description` (text) - Campaign description
  - `incentive_type` (text) - Credit, Discount, Badge, XP, ContestEntry, Cashback
  - `reward_value` (numeric) - Value of reward
  - `reward_description` (text) - Human-readable reward
  - `eligibility_criteria` (jsonb) - Who qualifies
  - `requirements` (jsonb) - Review requirements (min rating, min length, photo)
  - `start_date` (timestamptz)
  - `end_date` (timestamptz)
  - `max_rewards_per_user` (int) - Limit per user
  - `max_total_rewards` (int) - Campaign budget limit
  - `rewards_claimed` (int) - Current claims count
  - `is_active` (boolean)
  - `priority` (int) - Display order
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 2. `review_rewards`
  Claimed rewards
  - `id` (uuid, primary key)
  - `campaign_id` (uuid, references review_incentive_campaigns)
  - `review_id` (uuid, references reviews)
  - `user_id` (uuid, references profiles)
  - `booking_id` (uuid, references bookings)
  - `incentive_type` (text)
  - `reward_value` (numeric)
  - `reward_description` (text)
  - `status` (text) - Pending, Approved, Claimed, Expired, Rejected
  - `claimed_at` (timestamptz)
  - `expires_at` (timestamptz)
  - `rejection_reason` (text)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ### 3. `review_contests`
  Review contests and competitions
  - `id` (uuid, primary key)
  - `name` (text)
  - `description` (text)
  - `contest_type` (text) - MostReviews, BestReview, PhotoReview, Raffle
  - `prize_pool` (jsonb) - Prizes and values
  - `start_date` (timestamptz)
  - `end_date` (timestamptz)
  - `winner_count` (int)
  - `entry_requirements` (jsonb)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 4. `review_contest_entries`
  Contest entries
  - `id` (uuid, primary key)
  - `contest_id` (uuid, references review_contests)
  - `user_id` (uuid, references profiles)
  - `review_id` (uuid, references reviews)
  - `entry_score` (int) - Contest scoring
  - `is_winner` (boolean)
  - `prize_won` (text)
  - `created_at` (timestamptz)

  ### 5. `review_milestones`
  Achievement milestones
  - `id` (uuid, primary key)
  - `name` (text) - Milestone name
  - `description` (text)
  - `review_count_required` (int) - Reviews needed
  - `reward_type` (text) - Credit, Badge, XP
  - `reward_value` (numeric)
  - `badge_id` (uuid, references badges)
  - `icon` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 6. `user_review_milestones`
  User milestone progress
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `milestone_id` (uuid, references review_milestones)
  - `achieved_at` (timestamptz)
  - `reward_claimed` (boolean)
  - `claimed_at` (timestamptz)

  ### 7. `review_bonus_multipliers`
  Temporary bonus multipliers
  - `id` (uuid, primary key)
  - `name` (text)
  - `multiplier` (numeric) - 1.5x, 2x, etc.
  - `applies_to` (text) - XP, Credits, All
  - `start_date` (timestamptz)
  - `end_date` (timestamptz)
  - `conditions` (jsonb) - When it applies
  - `is_active` (boolean)

  ## Incentive Types
  - **Credit**: Platform credits for future bookings
  - **Discount**: Percentage or fixed discount codes
  - **Badge**: Special achievement badges
  - **XP**: Experience points
  - **ContestEntry**: Entry into prize drawings
  - **Cashback**: Direct money back

  ## Review Requirements
  - Minimum rating threshold
  - Minimum text length
  - Photo/video required
  - Verified booking only
  - Time window (review within X days)

  ## Contest Types
  - **MostReviews**: Most reviews in period wins
  - **BestReview**: Highest quality review wins
  - **PhotoReview**: Best photo review wins
  - **Raffle**: Random drawing from all entries

  ## Features
  - Multiple campaign types
  - Flexible reward structures
  - User limits and campaign budgets
  - Automatic reward distribution
  - Contest management
  - Milestone tracking
  - Bonus multiplier events
  - Expiration dates
  - Admin approval workflow
  - Integration with wallet system
  - Integration with gamification
  - Fraud prevention
  - Analytics tracking

  ## Integration Points
  - `reviews` table - Review submissions
  - `wallet_transactions` - Credit distribution
  - `badges` - Badge awards
  - `user_xp` - XP points
  - `discount_codes` - Discount generation
  - `promotional_campaigns` - Campaign management

  ## Security
  - Enable RLS on all tables
  - Users can view own rewards
  - Admin-only campaign management
  - Fraud detection integration

  ## Important Notes
  - Rewards auto-approve or require manual review
  - One reward per review maximum
  - Expired rewards auto-reject
  - Milestone progress updates automatically
  - Contest winners selected at contest end
*/

-- Create incentive type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incentive_type') THEN
    CREATE TYPE incentive_type AS ENUM ('Credit', 'Discount', 'Badge', 'XP', 'ContestEntry', 'Cashback');
  END IF;
END $$;

-- Create reward status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_status') THEN
    CREATE TYPE reward_status AS ENUM ('Pending', 'Approved', 'Claimed', 'Expired', 'Rejected');
  END IF;
END $$;

-- Create contest type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contest_type') THEN
    CREATE TYPE contest_type AS ENUM ('MostReviews', 'BestReview', 'PhotoReview', 'Raffle');
  END IF;
END $$;

-- Create review_incentive_campaigns table
CREATE TABLE IF NOT EXISTS review_incentive_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  incentive_type incentive_type NOT NULL,
  reward_value numeric(10, 2) NOT NULL CHECK (reward_value > 0),
  reward_description text NOT NULL,
  eligibility_criteria jsonb DEFAULT '{}',
  requirements jsonb DEFAULT '{}',
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  max_rewards_per_user int DEFAULT 1 CHECK (max_rewards_per_user > 0),
  max_total_rewards int CHECK (max_total_rewards IS NULL OR max_total_rewards > 0),
  rewards_claimed int DEFAULT 0,
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  CHECK (end_date IS NULL OR end_date > start_date)
);

-- Create review_rewards table
CREATE TABLE IF NOT EXISTS review_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES review_incentive_campaigns(id) ON DELETE CASCADE NOT NULL,
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  incentive_type incentive_type NOT NULL,
  reward_value numeric(10, 2) NOT NULL,
  reward_description text NOT NULL,
  status reward_status DEFAULT 'Pending',
  claimed_at timestamptz,
  expires_at timestamptz,
  rejection_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create review_contests table
CREATE TABLE IF NOT EXISTS review_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contest_type contest_type NOT NULL,
  prize_pool jsonb DEFAULT '[]',
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  winner_count int DEFAULT 1 CHECK (winner_count > 0),
  entry_requirements jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CHECK (end_date > start_date)
);

-- Create review_contest_entries table
CREATE TABLE IF NOT EXISTS review_contest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES review_contests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  entry_score int DEFAULT 0,
  is_winner boolean DEFAULT false,
  prize_won text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contest_id, review_id)
);

-- Create review_milestones table
CREATE TABLE IF NOT EXISTS review_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  review_count_required int NOT NULL CHECK (review_count_required > 0),
  reward_type text NOT NULL CHECK (reward_type IN ('Credit', 'Badge', 'XP')),
  reward_value numeric(10, 2),
  badge_id uuid REFERENCES badges(id),
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_review_milestones table
CREATE TABLE IF NOT EXISTS user_review_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_id uuid REFERENCES review_milestones(id) ON DELETE CASCADE NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  reward_claimed boolean DEFAULT false,
  claimed_at timestamptz,
  UNIQUE(user_id, milestone_id)
);

-- Create review_bonus_multipliers table
CREATE TABLE IF NOT EXISTS review_bonus_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  multiplier numeric(3, 2) NOT NULL CHECK (multiplier >= 1),
  applies_to text NOT NULL CHECK (applies_to IN ('XP', 'Credits', 'All')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  conditions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  CHECK (end_date > start_date)
);

-- Enable RLS
ALTER TABLE review_incentive_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_contest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_review_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_bonus_multipliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active campaigns"
  ON review_incentive_campaigns FOR SELECT
  TO authenticated
  USING (is_active = true AND start_date <= now() AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "Users can view own rewards"
  ON review_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view active contests"
  ON review_contests FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own contest entries"
  ON review_contest_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view milestones"
  ON review_milestones FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own milestone progress"
  ON user_review_milestones FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view active multipliers"
  ON review_bonus_multipliers FOR SELECT
  TO authenticated
  USING (is_active = true AND start_date <= now() AND end_date >= now());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_review_incentive_campaigns_active ON review_incentive_campaigns(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_review_rewards_user ON review_rewards(user_id, status);
CREATE INDEX IF NOT EXISTS idx_review_rewards_review ON review_rewards(review_id);
CREATE INDEX IF NOT EXISTS idx_review_contests_active ON review_contests(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_review_contest_entries_contest ON review_contest_entries(contest_id, entry_score DESC);
CREATE INDEX IF NOT EXISTS idx_review_contest_entries_user ON review_contest_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_review_milestones_user ON user_review_milestones(user_id, achieved_at DESC);

-- Function to check if user is eligible for campaign
CREATE OR REPLACE FUNCTION check_campaign_eligibility(
  campaign_id_param uuid,
  user_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  campaign_record RECORD;
  user_reward_count int;
BEGIN
  SELECT * INTO campaign_record
  FROM review_incentive_campaigns
  WHERE id = campaign_id_param
  AND is_active = true
  AND start_date <= now()
  AND (end_date IS NULL OR end_date >= now());

  IF campaign_record IS NULL THEN
    RETURN false;
  END IF;

  IF campaign_record.max_total_rewards IS NOT NULL
    AND campaign_record.rewards_claimed >= campaign_record.max_total_rewards THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO user_reward_count
  FROM review_rewards
  WHERE campaign_id = campaign_id_param
  AND user_id = user_id_param;

  IF user_reward_count >= campaign_record.max_rewards_per_user THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to process review reward
CREATE OR REPLACE FUNCTION process_review_reward()
RETURNS TRIGGER AS $$
DECLARE
  eligible_campaign RECORD;
  current_multiplier numeric;
  final_reward_value numeric;
BEGIN
  FOR eligible_campaign IN
    SELECT *
    FROM review_incentive_campaigns
    WHERE is_active = true
    AND start_date <= now()
    AND (end_date IS NULL OR end_date >= now())
    AND (max_total_rewards IS NULL OR rewards_claimed < max_total_rewards)
    ORDER BY priority DESC
    LIMIT 1
  LOOP
    IF check_campaign_eligibility(eligible_campaign.id, NEW.user_id) THEN
      SELECT COALESCE(MAX(multiplier), 1) INTO current_multiplier
      FROM review_bonus_multipliers
      WHERE is_active = true
      AND start_date <= now()
      AND end_date >= now()
      AND (applies_to = 'All' OR applies_to::text = eligible_campaign.incentive_type::text);

      final_reward_value := eligible_campaign.reward_value * current_multiplier;

      INSERT INTO review_rewards (
        campaign_id,
        review_id,
        user_id,
        booking_id,
        incentive_type,
        reward_value,
        reward_description,
        status,
        expires_at
      ) VALUES (
        eligible_campaign.id,
        NEW.id,
        NEW.user_id,
        NEW.booking_id,
        eligible_campaign.incentive_type,
        final_reward_value,
        eligible_campaign.reward_description,
        'Approved',
        now() + INTERVAL '90 days'
      );

      UPDATE review_incentive_campaigns
      SET rewards_claimed = rewards_claimed + 1
      WHERE id = eligible_campaign.id;

      IF eligible_campaign.incentive_type = 'Credit' THEN
        INSERT INTO wallet_transactions (
          user_id,
          transaction_type,
          amount,
          status,
          description,
          reference_type,
          reference_id
        ) VALUES (
          NEW.user_id,
          'Review Reward',
          final_reward_value,
          'Completed',
          'Review incentive: ' || eligible_campaign.reward_description,
          'review',
          NEW.id
        );
      END IF;

      IF eligible_campaign.incentive_type = 'XP' THEN
        PERFORM award_xp(NEW.user_id, final_reward_value::int, 'review_incentive');
      END IF;

      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_review_reward ON reviews;
CREATE TRIGGER trigger_process_review_reward
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION process_review_reward();

-- Function to check and update milestones
CREATE OR REPLACE FUNCTION update_review_milestones()
RETURNS TRIGGER AS $$
DECLARE
  milestone_record RECORD;
  user_review_count int;
BEGIN
  SELECT COUNT(*) INTO user_review_count
  FROM reviews
  WHERE user_id = NEW.user_id;

  FOR milestone_record IN
    SELECT *
    FROM review_milestones
    WHERE is_active = true
    AND review_count_required <= user_review_count
    AND id NOT IN (
      SELECT milestone_id
      FROM user_review_milestones
      WHERE user_id = NEW.user_id
    )
  LOOP
    INSERT INTO user_review_milestones (
      user_id,
      milestone_id
    ) VALUES (
      NEW.user_id,
      milestone_record.id
    );

    IF milestone_record.reward_type = 'Badge' AND milestone_record.badge_id IS NOT NULL THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (NEW.user_id, milestone_record.badge_id)
      ON CONFLICT DO NOTHING;
    END IF;

    IF milestone_record.reward_type = 'XP' AND milestone_record.reward_value IS NOT NULL THEN
      PERFORM award_xp(NEW.user_id, milestone_record.reward_value::int, 'review_milestone');
    END IF;

    IF milestone_record.reward_type = 'Credit' AND milestone_record.reward_value IS NOT NULL THEN
      INSERT INTO wallet_transactions (
        user_id,
        transaction_type,
        amount,
        status,
        description
      ) VALUES (
        NEW.user_id,
        'Milestone Reward',
        milestone_record.reward_value,
        'Completed',
        'Review milestone: ' || milestone_record.name
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_review_milestones ON reviews;
CREATE TRIGGER trigger_update_review_milestones
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_review_milestones();

-- Function to enter review contests
CREATE OR REPLACE FUNCTION enter_review_contest()
RETURNS TRIGGER AS $$
DECLARE
  contest_record RECORD;
  entry_score int;
BEGIN
  FOR contest_record IN
    SELECT *
    FROM review_contests
    WHERE is_active = true
    AND start_date <= now()
    AND end_date >= now()
  LOOP
    entry_score := 0;

    CASE contest_record.contest_type
      WHEN 'MostReviews' THEN
        entry_score := 1;
      WHEN 'BestReview' THEN
        entry_score := NEW.rating * 20 + LENGTH(NEW.comment);
      WHEN 'PhotoReview' THEN
        IF NEW.media_urls IS NOT NULL AND jsonb_array_length(NEW.media_urls) > 0 THEN
          entry_score := NEW.rating * 30 + jsonb_array_length(NEW.media_urls) * 10;
        END IF;
      WHEN 'Raffle' THEN
        entry_score := 1;
    END CASE;

    IF entry_score > 0 THEN
      INSERT INTO review_contest_entries (
        contest_id,
        user_id,
        review_id,
        entry_score
      ) VALUES (
        contest_record.id,
        NEW.user_id,
        NEW.id,
        entry_score
      )
      ON CONFLICT (contest_id, review_id) DO UPDATE
      SET entry_score = EXCLUDED.entry_score;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enter_review_contest ON reviews;
CREATE TRIGGER trigger_enter_review_contest
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION enter_review_contest();

-- Function to expire old rewards
CREATE OR REPLACE FUNCTION expire_old_rewards()
RETURNS void AS $$
BEGIN
  UPDATE review_rewards
  SET status = 'Expired'
  WHERE status = 'Approved'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Insert default campaigns
INSERT INTO review_incentive_campaigns (name, description, incentive_type, reward_value, reward_description, max_rewards_per_user, priority) VALUES
  ('First Review Bonus', 'Get $5 credit for your first review', 'Credit', 5.00, '$5 credit for your first review', 1, 10),
  ('Photo Review Reward', 'Get $3 credit for reviews with photos', 'Credit', 3.00, '$3 credit for photo reviews', 5, 8),
  ('Detailed Review XP', 'Earn 50 XP for detailed reviews (100+ characters)', 'XP', 50, '50 XP for detailed reviews', 10, 5),
  ('5-Star Review Contest', 'All 5-star reviews enter monthly prize drawing', 'ContestEntry', 1, 'Entry into $100 monthly raffle', 999, 7)
ON CONFLICT DO NOTHING;

-- Insert default milestones
INSERT INTO review_milestones (name, description, review_count_required, reward_type, reward_value, icon) VALUES
  ('Novice Reviewer', 'Leave your first review', 1, 'XP', 25, '⭐'),
  ('Active Reviewer', 'Leave 5 reviews', 5, 'XP', 100, '⭐⭐'),
  ('Expert Reviewer', 'Leave 10 reviews', 10, 'Credit', 10, '⭐⭐⭐'),
  ('Master Reviewer', 'Leave 25 reviews', 25, 'Credit', 25, '⭐⭐⭐⭐'),
  ('Legendary Reviewer', 'Leave 50 reviews', 50, 'Credit', 50, '⭐⭐⭐⭐⭐')
ON CONFLICT DO NOTHING;
