import { supabase } from './supabase';

export interface ReviewHelpfulVote {
  id: string;
  review_id: string;
  user_id: string;
  is_helpful: boolean;
  created_at: string;
}

export interface UserReviewVote {
  has_voted: boolean;
  is_helpful?: boolean;
  voted_at?: string;
}

export interface VoteResult {
  action: 'added' | 'updated' | 'removed';
  helpful_count: number;
  not_helpful_count: number;
  total_votes: number;
  helpfulness_score: number;
}

export interface MostHelpfulReview {
  review_id: string;
  rating: number;
  title: string;
  comment: string;
  reviewer_name: string;
  helpful_count: number;
  total_votes: number;
  helpfulness_score: number;
  created_at: string;
}

export interface HelpfulnessStats {
  total_reviews: number;
  reviews_with_votes: number;
  total_helpful_votes: number;
  total_not_helpful_votes: number;
  total_votes: number;
  avg_helpfulness_score: number;
  reviews_by_helpfulness: {
    highly_helpful: number;
    helpful: number;
    mixed: number;
    not_helpful: number;
  };
}

/**
 * Vote on a review's helpfulness
 */
export async function voteReviewHelpful(
  reviewId: string,
  isHelpful: boolean
): Promise<VoteResult | null> {
  try {
    const { data, error } = await supabase.rpc('vote_review_helpful', {
      review_id_param: reviewId,
      is_helpful_param: isHelpful,
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error voting on review:', error);
    if (error.message.includes('Cannot vote on your own review')) {
      throw new Error('You cannot vote on your own review');
    }
    throw new Error(error.message || 'Failed to vote on review');
  }
}

/**
 * Get user's vote on a specific review
 */
export async function getUserReviewVote(
  reviewId: string,
  userId?: string
): Promise<UserReviewVote> {
  try {
    const { data, error } = await supabase.rpc('get_user_review_vote', {
      review_id_param: reviewId,
      user_id_param: userId,
    });

    if (error) throw error;

    return data || { has_voted: false };
  } catch (error) {
    console.error('Error getting user vote:', error);
    return { has_voted: false };
  }
}

/**
 * Get most helpful reviews
 */
export async function getMostHelpfulReviews(
  providerId?: string,
  limit: number = 10,
  minVotes: number = 5
): Promise<MostHelpfulReview[]> {
  try {
    const { data, error } = await supabase.rpc('get_most_helpful_reviews', {
      provider_id_param: providerId,
      limit_param: limit,
      min_votes_param: minVotes,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting most helpful reviews:', error);
    return [];
  }
}

/**
 * Get review helpfulness statistics
 */
export async function getReviewHelpfulnessStats(
  providerId?: string
): Promise<HelpfulnessStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_review_helpfulness_stats', {
      provider_id_param: providerId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting helpfulness stats:', error);
    return null;
  }
}

/**
 * Get reviews with helpfulness info (using view)
 */
export async function getReviewsWithHelpfulness(filters?: {
  providerId?: string;
  helpfulnessCategory?:
    | 'highly_helpful'
    | 'helpful'
    | 'mixed'
    | 'not_helpful'
    | 'insufficient_votes';
  minScore?: number;
  limit?: number;
}): Promise<any[]> {
  try {
    let query = supabase.from('reviews_with_helpfulness').select('*');

    if (filters?.providerId) {
      query = query.eq('reviewee_id', filters.providerId);
    }

    if (filters?.helpfulnessCategory) {
      query = query.eq('helpfulness_category', filters.helpfulnessCategory);
    }

    if (filters?.minScore !== undefined) {
      query = query.gte('helpfulness_score', filters.minScore);
    }

    query = query.order('helpfulness_score', { ascending: false });
    query = query.order('helpful_count', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting reviews with helpfulness:', error);
    return [];
  }
}

/**
 * Get all votes by a user
 */
export async function getUserVotes(userId: string, limit: number = 50): Promise<ReviewHelpfulVote[]> {
  try {
    const { data, error } = await supabase
      .from('review_helpful_votes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting user votes:', error);
    return [];
  }
}

/**
 * Get votes for a specific review
 */
export async function getReviewVotes(reviewId: string): Promise<ReviewHelpfulVote[]> {
  try {
    const { data, error } = await supabase
      .from('review_helpful_votes')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting review votes:', error);
    return [];
  }
}

/**
 * Calculate helpfulness percentage
 */
export function calculateHelpfulnessPercentage(
  helpfulCount: number,
  totalVotes: number
): number {
  if (totalVotes === 0) return 0;
  return Math.round((helpfulCount / totalVotes) * 100);
}

/**
 * Get helpfulness category
 */
export function getHelpfulnessCategory(
  percentage: number,
  totalVotes: number
): 'highly_helpful' | 'helpful' | 'mixed' | 'not_helpful' | 'insufficient_votes' {
  if (totalVotes < 3) return 'insufficient_votes';
  if (percentage >= 80) return 'highly_helpful';
  if (percentage >= 60) return 'helpful';
  if (percentage >= 40) return 'mixed';
  return 'not_helpful';
}

/**
 * Get helpfulness label
 */
export function getHelpfulnessLabel(category: string): string {
  const labels: Record<string, string> = {
    highly_helpful: 'Highly Helpful',
    helpful: 'Helpful',
    mixed: 'Mixed',
    not_helpful: 'Not Helpful',
    insufficient_votes: 'Not enough votes',
  };
  return labels[category] || '';
}

/**
 * Get helpfulness color
 */
export function getHelpfulnessColor(
  category: string
): 'success' | 'primary' | 'warning' | 'error' | 'textSecondary' {
  const colors: Record<string, any> = {
    highly_helpful: 'success',
    helpful: 'primary',
    mixed: 'warning',
    not_helpful: 'error',
    insufficient_votes: 'textSecondary',
  };
  return colors[category] || 'textSecondary';
}

/**
 * Format vote count for display
 */
export function formatVoteCount(count: number): string {
  if (count === 0) return 'No votes yet';
  if (count === 1) return '1 person found this helpful';
  return `${count} people found this helpful`;
}

/**
 * Sort reviews by helpfulness
 */
export function sortReviewsByHelpfulness(
  reviews: any[],
  sortBy: 'score' | 'votes' | 'recent' = 'score'
): any[] {
  const sorted = [...reviews];

  if (sortBy === 'score') {
    sorted.sort((a, b) => {
      // Sort by helpfulness score, then by helpful count
      if (b.helpfulness_score !== a.helpfulness_score) {
        return b.helpfulness_score - a.helpfulness_score;
      }
      return b.helpful_count - a.helpful_count;
    });
  } else if (sortBy === 'votes') {
    sorted.sort((a, b) => b.total_votes - a.total_votes);
  } else if (sortBy === 'recent') {
    sorted.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }

  return sorted;
}

/**
 * Filter reviews by helpfulness threshold
 */
export function filterHelpfulReviews(
  reviews: any[],
  minPercentage: number = 60,
  minVotes: number = 3
): any[] {
  return reviews.filter((review) => {
    const percentage = calculateHelpfulnessPercentage(
      review.helpful_count,
      review.total_votes
    );
    return review.total_votes >= minVotes && percentage >= minPercentage;
  });
}

/**
 * Get vote summary text
 */
export function getVoteSummaryText(
  helpfulCount: number,
  notHelpfulCount: number,
  totalVotes: number
): string {
  if (totalVotes === 0) return 'Be the first to vote';

  const percentage = calculateHelpfulnessPercentage(helpfulCount, totalVotes);

  if (percentage >= 90) {
    return `${totalVotes} ${totalVotes === 1 ? 'person' : 'people'} found this very helpful`;
  } else if (percentage >= 70) {
    return `${totalVotes} ${totalVotes === 1 ? 'person' : 'people'} found this helpful`;
  } else if (percentage >= 50) {
    return `${helpfulCount} of ${totalVotes} found this helpful`;
  } else {
    return `${notHelpfulCount} of ${totalVotes} found this not helpful`;
  }
}

/**
 * Check if review needs more votes
 */
export function needsMoreVotes(totalVotes: number, threshold: number = 3): boolean {
  return totalVotes < threshold;
}

/**
 * Subscribe to vote changes for a review
 */
export function subscribeToReviewVotes(reviewId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`review_votes_${reviewId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'review_helpful_votes',
        filter: `review_id=eq.${reviewId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Batch get user votes for multiple reviews
 */
export async function batchGetUserVotes(reviewIds: string[]): Promise<Map<string, UserReviewVote>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Map();

    const { data, error } = await supabase
      .from('review_helpful_votes')
      .select('review_id, is_helpful, created_at')
      .eq('user_id', user.id)
      .in('review_id', reviewIds);

    if (error) throw error;

    const votesMap = new Map<string, UserReviewVote>();

    data?.forEach((vote) => {
      votesMap.set(vote.review_id, {
        has_voted: true,
        is_helpful: vote.is_helpful,
        voted_at: vote.created_at,
      });
    });

    return votesMap;
  } catch (error) {
    console.error('Error batch getting user votes:', error);
    return new Map();
  }
}

/**
 * Get trending helpful reviews (high votes recently)
 */
export async function getTrendingHelpfulReviews(
  daysBack: number = 7,
  limit: number = 10
): Promise<any[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('reviews_with_helpfulness')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .gte('total_votes', 3)
      .gte('helpfulness_score', 70)
      .order('helpful_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting trending helpful reviews:', error);
    return [];
  }
}
