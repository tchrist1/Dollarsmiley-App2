import { supabase } from './supabase';

export type IncentiveType = 'Credit' | 'Discount' | 'Badge' | 'XP' | 'ContestEntry' | 'Cashback';
export type RewardStatus = 'Pending' | 'Approved' | 'Claimed' | 'Expired' | 'Rejected';
export type ContestType = 'MostReviews' | 'BestReview' | 'PhotoReview' | 'Raffle';

export interface ReviewIncentiveCampaign {
  id: string;
  name: string;
  description: string | null;
  incentive_type: IncentiveType;
  reward_value: number;
  reward_description: string;
  eligibility_criteria: Record<string, any>;
  requirements: Record<string, any>;
  start_date: string;
  end_date: string | null;
  max_rewards_per_user: number;
  max_total_rewards: number | null;
  rewards_claimed: number;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
}

export interface ReviewReward {
  id: string;
  campaign_id: string;
  review_id: string;
  user_id: string;
  booking_id: string;
  incentive_type: IncentiveType;
  reward_value: number;
  reward_description: string;
  status: RewardStatus;
  claimed_at: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ReviewContest {
  id: string;
  name: string;
  description: string | null;
  contest_type: ContestType;
  prize_pool: any[];
  start_date: string;
  end_date: string;
  winner_count: number;
  entry_requirements: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface ReviewContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  review_id: string;
  entry_score: number;
  is_winner: boolean;
  prize_won: string | null;
  created_at: string;
}

export interface ReviewMilestone {
  id: string;
  name: string;
  description: string | null;
  review_count_required: number;
  reward_type: string;
  reward_value: number | null;
  badge_id: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserReviewMilestone {
  id: string;
  user_id: string;
  milestone_id: string;
  achieved_at: string;
  reward_claimed: boolean;
  claimed_at: string | null;
}

export interface ReviewBonusMultiplier {
  id: string;
  name: string;
  multiplier: number;
  applies_to: string;
  start_date: string;
  end_date: string;
  conditions: Record<string, any>;
  is_active: boolean;
}

/**
 * Get active incentive campaigns
 */
export async function getActiveCampaigns(): Promise<ReviewIncentiveCampaign[]> {
  try {
    const { data, error } = await supabase
      .from('review_incentive_campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return [];
  }
}

/**
 * Get campaign by ID
 */
export async function getCampaignById(campaignId: string): Promise<ReviewIncentiveCampaign | null> {
  try {
    const { data, error } = await supabase
      .from('review_incentive_campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return null;
  }
}

/**
 * Check campaign eligibility
 */
export async function checkCampaignEligibility(
  campaignId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_campaign_eligibility', {
      campaign_id_param: campaignId,
      user_id_param: userId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return false;
  }
}

/**
 * Get user rewards
 */
export async function getUserRewards(
  userId: string,
  status?: RewardStatus
): Promise<ReviewReward[]> {
  try {
    let query = supabase
      .from('review_rewards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    return [];
  }
}

/**
 * Get reward by review ID
 */
export async function getRewardByReviewId(reviewId: string): Promise<ReviewReward | null> {
  try {
    const { data, error } = await supabase
      .from('review_rewards')
      .select('*')
      .eq('review_id', reviewId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching reward:', error);
    return null;
  }
}

/**
 * Claim reward
 */
export async function claimReward(rewardId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('review_rewards')
      .update({
        status: 'Claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', rewardId)
      .eq('status', 'Approved');

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error claiming reward:', error);
    return false;
  }
}

/**
 * Get active contests
 */
export async function getActiveContests(): Promise<ReviewContest[]> {
  try {
    const { data, error } = await supabase
      .from('review_contests')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .order('end_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active contests:', error);
    return [];
  }
}

/**
 * Get contest by ID
 */
export async function getContestById(contestId: string): Promise<ReviewContest | null> {
  try {
    const { data, error } = await supabase
      .from('review_contests')
      .select('*')
      .eq('id', contestId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching contest:', error);
    return null;
  }
}

/**
 * Get user contest entries
 */
export async function getUserContestEntries(userId: string): Promise<ReviewContestEntry[]> {
  try {
    const { data, error } = await supabase
      .from('review_contest_entries')
      .select('*, contest:review_contests(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching contest entries:', error);
    return [];
  }
}

/**
 * Get contest leaderboard
 */
export async function getContestLeaderboard(
  contestId: string,
  limit: number = 10
): Promise<ReviewContestEntry[]> {
  try {
    const { data, error } = await supabase
      .from('review_contest_entries')
      .select('*, user:profiles(id, full_name, avatar_url)')
      .eq('contest_id', contestId)
      .order('entry_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

/**
 * Get review milestones
 */
export async function getReviewMilestones(): Promise<ReviewMilestone[]> {
  try {
    const { data, error } = await supabase
      .from('review_milestones')
      .select('*')
      .eq('is_active', true)
      .order('review_count_required', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return [];
  }
}

/**
 * Get user milestone progress
 */
export async function getUserMilestoneProgress(
  userId: string
): Promise<{
  achieved: UserReviewMilestone[];
  available: ReviewMilestone[];
  reviewCount: number;
}> {
  try {
    const [achievedResult, milestonesResult, reviewCountResult] = await Promise.all([
      supabase
        .from('user_review_milestones')
        .select('*, milestone:review_milestones(*)')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false }),
      supabase
        .from('review_milestones')
        .select('*')
        .eq('is_active', true)
        .order('review_count_required', { ascending: true }),
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

    const achieved = achievedResult.data || [];
    const allMilestones = milestonesResult.data || [];
    const reviewCount = reviewCountResult.count || 0;

    const achievedIds = new Set(achieved.map((a) => a.milestone_id));
    const available = allMilestones.filter((m) => !achievedIds.has(m.id));

    return {
      achieved,
      available,
      reviewCount,
    };
  } catch (error) {
    console.error('Error fetching milestone progress:', error);
    return { achieved: [], available: [], reviewCount: 0 };
  }
}

/**
 * Get active bonus multipliers
 */
export async function getActiveBonusMultipliers(): Promise<ReviewBonusMultiplier[]> {
  try {
    const { data, error } = await supabase
      .from('review_bonus_multipliers')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString());

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching bonus multipliers:', error);
    return [];
  }
}

/**
 * Calculate total pending rewards value
 */
export async function calculatePendingRewardsValue(userId: string): Promise<number> {
  try {
    const rewards = await getUserRewards(userId, 'Approved');
    return rewards
      .filter((r) => r.incentive_type === 'Credit' || r.incentive_type === 'Cashback')
      .reduce((sum, r) => sum + r.reward_value, 0);
  } catch (error) {
    console.error('Error calculating pending rewards:', error);
    return 0;
  }
}

/**
 * Get reward statistics
 */
export async function getRewardStatistics(userId: string): Promise<{
  totalRewards: number;
  totalValue: number;
  claimedRewards: number;
  pendingRewards: number;
  expiredRewards: number;
}> {
  try {
    const rewards = await getUserRewards(userId);

    return {
      totalRewards: rewards.length,
      totalValue: rewards.reduce((sum, r) => sum + r.reward_value, 0),
      claimedRewards: rewards.filter((r) => r.status === 'Claimed').length,
      pendingRewards: rewards.filter((r) => r.status === 'Approved').length,
      expiredRewards: rewards.filter((r) => r.status === 'Expired').length,
    };
  } catch (error) {
    console.error('Error fetching reward statistics:', error);
    return {
      totalRewards: 0,
      totalValue: 0,
      claimedRewards: 0,
      pendingRewards: 0,
      expiredRewards: 0,
    };
  }
}

/**
 * Get incentive type display
 */
export function getIncentiveTypeDisplay(type: IncentiveType): {
  label: string;
  icon: string;
  color: string;
} {
  const displays: Record<IncentiveType, { label: string; icon: string; color: string }> = {
    Credit: { label: 'Platform Credit', icon: '💰', color: '#10B981' },
    Discount: { label: 'Discount Code', icon: '🎟️', color: '#F59E0B' },
    Badge: { label: 'Achievement Badge', icon: '🏆', color: '#EF4444' },
    XP: { label: 'Experience Points', icon: '⭐', color: '#8B5CF6' },
    ContestEntry: { label: 'Contest Entry', icon: '🎲', color: '#06B6D4' },
    Cashback: { label: 'Cash Back', icon: '💵', color: '#10B981' },
  };
  return displays[type];
}

/**
 * Get reward status display
 */
export function getRewardStatusDisplay(status: RewardStatus): {
  label: string;
  color: string;
} {
  const displays: Record<RewardStatus, { label: string; color: string }> = {
    Pending: { label: 'Pending', color: '#F59E0B' },
    Approved: { label: 'Available', color: '#10B981' },
    Claimed: { label: 'Claimed', color: '#6B7280' },
    Expired: { label: 'Expired', color: '#EF4444' },
    Rejected: { label: 'Rejected', color: '#EF4444' },
  };
  return displays[status];
}

/**
 * Get contest type display
 */
export function getContestTypeDisplay(type: ContestType): {
  label: string;
  description: string;
} {
  const displays: Record<ContestType, { label: string; description: string }> = {
    MostReviews: {
      label: 'Most Reviews',
      description: 'Leave the most reviews to win',
    },
    BestReview: {
      label: 'Best Review',
      description: 'Write the highest quality review',
    },
    PhotoReview: {
      label: 'Photo Review',
      description: 'Submit the best photo review',
    },
    Raffle: {
      label: 'Raffle',
      description: 'Random drawing from all entries',
    },
  };
  return displays[type];
}

/**
 * Format reward value
 */
export function formatRewardValue(value: number, type: IncentiveType): string {
  switch (type) {
    case 'Credit':
    case 'Cashback':
      return `$${value.toFixed(2)}`;
    case 'XP':
      return `${value} XP`;
    case 'Discount':
      return `${value}% off`;
    case 'ContestEntry':
      return `${value} ${value === 1 ? 'entry' : 'entries'}`;
    case 'Badge':
      return 'Badge';
    default:
      return value.toString();
  }
}

/**
 * Get next milestone
 */
export function getNextMilestone(
  reviewCount: number,
  milestones: ReviewMilestone[]
): ReviewMilestone | null {
  const sortedMilestones = [...milestones].sort(
    (a, b) => a.review_count_required - b.review_count_required
  );

  for (const milestone of sortedMilestones) {
    if (milestone.review_count_required > reviewCount) {
      return milestone;
    }
  }

  return null;
}

/**
 * Calculate milestone progress percentage
 */
export function calculateMilestoneProgress(
  reviewCount: number,
  milestone: ReviewMilestone
): number {
  if (reviewCount >= milestone.review_count_required) {
    return 100;
  }
  return (reviewCount / milestone.review_count_required) * 100;
}

/**
 * Check if review meets requirements
 */
export function checkReviewRequirements(
  review: {
    rating: number;
    comment: string;
    media_urls?: any;
  },
  requirements: Record<string, any>
): { meets: boolean; missing: string[] } {
  const missing: string[] = [];

  if (requirements.min_rating && review.rating < requirements.min_rating) {
    missing.push(`Minimum ${requirements.min_rating} stars required`);
  }

  if (requirements.min_length && review.comment.length < requirements.min_length) {
    missing.push(`Minimum ${requirements.min_length} characters required`);
  }

  if (requirements.photo_required) {
    const hasPhotos =
      review.media_urls &&
      Array.isArray(review.media_urls) &&
      review.media_urls.length > 0;
    if (!hasPhotos) {
      missing.push('Photo required');
    }
  }

  return {
    meets: missing.length === 0,
    missing,
  };
}

/**
 * Get days until expiration
 */
export function getDaysUntilExpiration(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if reward is expiring soon
 */
export function isExpiringSoon(expiresAt: string, days: number = 7): boolean {
  const daysUntil = getDaysUntilExpiration(expiresAt);
  return daysUntil <= days && daysUntil > 0;
}
