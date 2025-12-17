import { supabase } from './supabase';

/**
 * Gamification System Utilities
 * Handles XP, levels, achievements, and user progression
 */

export interface UserLevel {
  level: number;
  title: string;
  xp_required: number;
  perks: string[];
  badge_color: string;
}

export interface ProfileGamification {
  profile_id: string;
  current_level: number;
  total_xp: number;
  current_level_xp: number;
  lifetime_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  bookings_completed: number;
  jobs_posted: number;
  reviews_received: number;
  five_star_reviews: number;
  profile_views: number;
  total_earnings: number;
  achievements_count: number;
  badges_count: number;
  rank_position?: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  category: 'booking' | 'social' | 'profile' | 'earnings' | 'quality' | 'milestone' | 'special';
  xp_reward: number;
  criteria: Record<string, any>;
  is_secret: boolean;
  is_active: boolean;
  display_order: number;
}

export interface ProfileAchievement {
  id: string;
  profile_id: string;
  achievement_id: string;
  earned_at: string;
  progress: Record<string, any>;
  is_new: boolean;
  achievement: Achievement;
}

export interface XPTransaction {
  id: string;
  profile_id: string;
  xp_amount: number;
  source: string;
  source_id?: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface LeaderboardEntry {
  profile_id: string;
  full_name: string;
  current_level: number;
  total_xp: number;
  rank_position: number;
  avatar_url?: string;
}

/**
 * Get user's gamification data
 */
export async function getProfileGamification(profileId: string): Promise<ProfileGamification | null> {
  const { data, error } = await supabase
    .from('profile_gamification')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile gamification:', error);
    return null;
  }

  return data;
}

/**
 * Get all user levels
 */
export async function getUserLevels(): Promise<UserLevel[]> {
  const { data, error } = await supabase
    .from('user_levels')
    .select('*')
    .order('level', { ascending: true });

  if (error) {
    console.error('Error fetching user levels:', error);
    return [];
  }

  return data || [];
}

/**
 * Get specific level
 */
export async function getUserLevel(level: number): Promise<UserLevel | null> {
  const { data, error } = await supabase
    .from('user_levels')
    .select('*')
    .eq('level', level)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user level:', error);
    return null;
  }

  return data;
}

/**
 * Award XP to user
 */
export async function awardXP(
  profileId: string,
  xpAmount: number,
  source: string,
  sourceId?: string,
  description?: string
): Promise<void> {
  const { error } = await supabase.rpc('award_xp', {
    p_profile_id: profileId,
    p_xp_amount: xpAmount,
    p_source: source,
    p_source_id: sourceId,
    p_description: description,
  });

  if (error) {
    console.error('Error awarding XP:', error);
    throw error;
  }
}

/**
 * Update activity streak
 */
export async function updateActivityStreak(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('update_activity_streak', {
    p_profile_id: profileId,
  });

  if (error) {
    console.error('Error updating activity streak:', error);
    throw error;
  }
}

/**
 * Get user's achievements
 */
export async function getProfileAchievements(
  profileId: string
): Promise<ProfileAchievement[]> {
  const { data, error } = await supabase
    .from('profile_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('profile_id', profileId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('Error fetching profile achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all achievements
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .order('category, tier, display_order');

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get new achievements (unviewed)
 */
export async function getNewAchievements(profileId: string): Promise<ProfileAchievement[]> {
  const { data, error } = await supabase
    .from('profile_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('profile_id', profileId)
    .eq('is_new', true)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('Error fetching new achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark achievements as viewed
 */
export async function markAchievementsAsViewed(achievementIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('profile_achievements')
    .update({ is_new: false })
    .in('id', achievementIds);

  if (error) {
    console.error('Error marking achievements as viewed:', error);
    throw error;
  }
}

/**
 * Get XP transaction history
 */
export async function getXPTransactions(
  profileId: string,
  limit: number = 50
): Promise<XPTransaction[]> {
  const { data, error } = await supabase
    .from('xp_transactions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching XP transactions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  limit: number = 100,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profile_gamification')
    .select(`
      profile_id,
      current_level,
      total_xp,
      rank_position,
      profiles!inner(full_name, avatar_url)
    `)
    .order('total_xp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return (data || []).map((entry: any, index) => ({
    profile_id: entry.profile_id,
    full_name: entry.profiles.full_name,
    current_level: entry.current_level,
    total_xp: entry.total_xp,
    rank_position: offset + index + 1,
    avatar_url: entry.profiles.avatar_url,
  }));
}

/**
 * Calculate XP progress to next level
 */
export function calculateLevelProgress(
  currentLevelXp: number,
  currentLevel: number,
  nextLevel?: UserLevel
): { percentage: number; xpNeeded: number; xpProgress: number } {
  if (!nextLevel) {
    return { percentage: 100, xpNeeded: 0, xpProgress: currentLevelXp };
  }

  const xpProgress = currentLevelXp;
  const xpNeeded = nextLevel.xp_required;
  const percentage = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

  return { percentage, xpNeeded, xpProgress };
}

/**
 * Get tier color
 */
export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  };
  return colors[tier] || '#94A3B8';
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    booking: 'calendar',
    social: 'users',
    profile: 'user',
    earnings: 'dollar-sign',
    quality: 'star',
    milestone: 'trophy',
    special: 'crown',
  };
  return icons[category] || 'award';
}

/**
 * Format XP number
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

/**
 * Get XP source display name
 */
export function getXPSourceDisplayName(source: string): string {
  const sourceNames: Record<string, string> = {
    booking_completed: 'Booking Completed',
    five_star_review: '5-Star Review',
    profile_complete: 'Profile Complete',
    first_booking: 'First Booking Bonus',
    verification: 'Verification',
    daily_login: 'Daily Login',
    job_posted: 'Job Posted',
    job_application: 'Job Application',
    message_sent: 'Message Sent',
    achievement: 'Achievement Unlocked',
    admin_award: 'Admin Award',
  };
  return sourceNames[source] || source;
}

/**
 * Check if achievement criteria met (client-side check)
 */
export function checkAchievementProgress(
  achievement: Achievement,
  gamification: ProfileGamification
): { met: boolean; progress: number } {
  const criteria = achievement.criteria;

  if (criteria.bookings_completed) {
    const progress = Math.min(100, (gamification.bookings_completed / criteria.bookings_completed) * 100);
    return { met: gamification.bookings_completed >= criteria.bookings_completed, progress };
  }

  if (criteria.five_star_reviews) {
    const progress = Math.min(100, (gamification.five_star_reviews / criteria.five_star_reviews) * 100);
    return { met: gamification.five_star_reviews >= criteria.five_star_reviews, progress };
  }

  if (criteria.current_level) {
    const progress = Math.min(100, (gamification.current_level / criteria.current_level) * 100);
    return { met: gamification.current_level >= criteria.current_level, progress };
  }

  if (criteria.current_streak) {
    const progress = Math.min(100, (gamification.current_streak / criteria.current_streak) * 100);
    return { met: gamification.current_streak >= criteria.current_streak, progress };
  }

  if (criteria.total_earnings) {
    const progress = Math.min(100, (gamification.total_earnings / criteria.total_earnings) * 100);
    return { met: gamification.total_earnings >= criteria.total_earnings, progress };
  }

  if (criteria.profile_views) {
    const progress = Math.min(100, (gamification.profile_views / criteria.profile_views) * 100);
    return { met: gamification.profile_views >= criteria.profile_views, progress };
  }

  return { met: false, progress: 0 };
}

/**
 * Get achievement completion percentage
 */
export function getAchievementCompletionPercentage(
  earnedAchievements: number,
  totalAchievements: number
): number {
  if (totalAchievements === 0) return 0;
  return Math.round((earnedAchievements / totalAchievements) * 100);
}

/**
 * Get rank display name
 */
export function getRankDisplayName(rank: number): string {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

/**
 * Quick XP award helpers
 */
export const quickAwardXP = {
  bookingAccepted: (profileId: string, bookingId: string) =>
    awardXP(profileId, 15, 'booking_accepted', bookingId, 'Accepted a booking request'),

  bookingCompleted: (profileId: string, bookingId: string) =>
    awardXP(profileId, 50, 'booking_completed', bookingId, 'Completed a booking'),

  fiveStarReview: (profileId: string, reviewId: string) =>
    awardXP(profileId, 25, 'five_star_review', reviewId, 'Received a 5-star review'),

  profileComplete: (profileId: string) =>
    awardXP(profileId, 20, 'profile_complete', undefined, 'Completed profile'),

  firstBooking: (profileId: string, bookingId: string) =>
    awardXP(profileId, 100, 'first_booking', bookingId, 'Completed first booking'),

  verification: (profileId: string, type: string) =>
    awardXP(profileId, 50, 'verification', undefined, `Completed ${type} verification`),

  dailyLogin: (profileId: string) =>
    updateActivityStreak(profileId),

  jobPosted: (profileId: string, jobId: string) =>
    awardXP(profileId, 10, 'job_posted', jobId, 'Posted a job'),

  jobApplication: (profileId: string, jobId: string) =>
    awardXP(profileId, 5, 'job_application', jobId, 'Applied to a job'),

  messageSent: (profileId: string) =>
    awardXP(profileId, 2, 'message_sent', undefined, 'Sent a message'),
};
