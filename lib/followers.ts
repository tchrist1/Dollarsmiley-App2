import { supabase } from './supabase';

export interface FollowUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_followed_by: boolean;
  followed_at?: string;
}

export interface MutualFollow {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  mutual_since: string;
}

export interface SuggestedFollower {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  location_city?: string;
  location_state?: string;
  relevance_score: number;
  mutual_followers_count: number;
  shared_categories_count: number;
  distance_km?: number;
  suggestion_reason: string;
}

export interface PopularProvider {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  average_rating: number;
  total_reviews: number;
  distance_km: number;
  top_category: string;
}

export interface SimilarInterestUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  shared_categories_count: number;
  shared_categories: string[];
}

export interface TrendingProvider {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  recent_bookings_count: number;
  recent_posts_count: number;
  trending_score: number;
}

export async function getUserFollowers(
  userId: string,
  currentUserId: string,
  limit: number = 20,
  offset: number = 0,
  searchQuery?: string
): Promise<FollowUser[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_followers', {
      p_user_id: userId,
      p_current_user_id: currentUserId,
      result_limit: limit,
      result_offset: offset,
      search_query: searchQuery || null,
    });

    if (error) throw error;

    return (data || []) as FollowUser[];
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
}

export async function getUserFollowing(
  userId: string,
  currentUserId: string,
  limit: number = 20,
  offset: number = 0,
  searchQuery?: string
): Promise<FollowUser[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_following', {
      p_user_id: userId,
      p_current_user_id: currentUserId,
      result_limit: limit,
      result_offset: offset,
      search_query: searchQuery || null,
    });

    if (error) throw error;

    return (data || []) as FollowUser[];
  } catch (error) {
    console.error('Error getting following:', error);
    return [];
  }
}

export async function getMutualFollows(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<MutualFollow[]> {
  try {
    const { data, error } = await supabase.rpc('get_mutual_follows', {
      p_user_id: userId,
      result_limit: limit,
      result_offset: offset,
    });

    if (error) throw error;

    return (data || []) as MutualFollow[];
  } catch (error) {
    console.error('Error getting mutual follows:', error);
    return [];
  }
}

export async function getFollowersCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_followers_count', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data || 0;
  } catch (error) {
    console.error('Error getting followers count:', error);
    return 0;
  }
}

export async function getFollowingCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_following_count', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data || 0;
  } catch (error) {
    console.error('Error getting following count:', error);
    return 0;
  }
}

export async function areMutualFollows(
  userId1: string,
  userId2: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('are_mutual_follows', {
      p_user_id_1: userId1,
      p_user_id_2: userId2,
    });

    if (error) throw error;

    return data || false;
  } catch (error) {
    console.error('Error checking mutual follows:', error);
    return false;
  }
}

export async function getFollowersYouMightKnow(
  userId: string,
  limit: number = 10
): Promise<SuggestedFollower[]> {
  try {
    const { data, error } = await supabase.rpc('get_followers_you_might_know', {
      p_user_id: userId,
      result_limit: limit,
    });

    if (error) throw error;

    return (data || []) as SuggestedFollower[];
  } catch (error) {
    console.error('Error getting suggested followers:', error);
    return [];
  }
}

export async function getEnhancedFollowSuggestions(
  userId: string,
  limit: number = 20
): Promise<SuggestedFollower[]> {
  try {
    const { data, error } = await supabase.rpc('get_enhanced_follow_suggestions', {
      p_user_id: userId,
      result_limit: limit,
    });

    if (error) throw error;

    return (data || []) as SuggestedFollower[];
  } catch (error) {
    console.error('Error getting enhanced suggestions:', error);
    return [];
  }
}

export async function getPopularProvidersNearby(
  userId: string,
  radiusKm: number = 50,
  limit: number = 10
): Promise<PopularProvider[]> {
  try {
    const { data, error } = await supabase.rpc('get_popular_providers_nearby', {
      p_user_id: userId,
      radius_km: radiusKm,
      result_limit: limit,
    });

    if (error) throw error;

    return (data || []) as PopularProvider[];
  } catch (error) {
    console.error('Error getting popular providers:', error);
    return [];
  }
}

export async function getSimilarInterestUsers(
  userId: string,
  limit: number = 10
): Promise<SimilarInterestUser[]> {
  try {
    const { data, error } = await supabase.rpc('get_similar_interest_users', {
      p_user_id: userId,
      result_limit: limit,
    });

    if (error) throw error;

    return (data || []) as SimilarInterestUser[];
  } catch (error) {
    console.error('Error getting similar interest users:', error);
    return [];
  }
}

export async function getTrendingProvidersInCategories(
  userId: string,
  daysBack: number = 30,
  limit: number = 10
): Promise<TrendingProvider[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_providers_in_categories', {
      p_user_id: userId,
      days_back: daysBack,
      result_limit: limit,
    });

    if (error) throw error;

    return (data || []) as TrendingProvider[];
  } catch (error) {
    console.error('Error getting trending providers:', error);
    return [];
  }
}

export async function followUser(
  followerId: string,
  followingId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
}

export function subscribeToFollowers(userId: string, callback: () => void) {
  const channel = supabase
    .channel(`followers_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_follows',
        filter: `following_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToFollowing(userId: string, callback: () => void) {
  const channel = supabase
    .channel(`following_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_follows',
        filter: `follower_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
