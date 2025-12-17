import { supabase } from './supabase';

export type FeedFilterType = 'all' | 'following' | 'trending' | 'recent';

export interface FeedPost {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  location?: {
    name?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    full_name: string;
    avatar_url?: string;
    user_type: string;
    is_verified: boolean;
  };
  is_following: boolean;
  is_liked: boolean;
}

export interface SuggestedUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  posts_count: number;
}

export async function getFollowingFeed(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<FeedPost[]> {
  try {
    const { data, error } = await supabase.rpc('get_following_feed', {
      p_user_id: userId,
      result_limit: limit,
      result_offset: offset,
    });

    if (error) throw error;

    return (data || []) as FeedPost[];
  } catch (error) {
    console.error('Error getting following feed:', error);
    return [];
  }
}

export async function getFilteredFeed(
  userId: string,
  filterType: FeedFilterType = 'all',
  limit: number = 20,
  offset: number = 0
): Promise<FeedPost[]> {
  try {
    const { data, error } = await supabase.rpc('get_filtered_feed', {
      p_user_id: userId,
      p_filter_type: filterType,
      result_limit: limit,
      result_offset: offset,
    });

    if (error) throw error;

    return (data || []) as FeedPost[];
  } catch (error) {
    console.error('Error getting filtered feed:', error);
    return [];
  }
}

export async function getFollowingFeedCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_following_feed_count', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data || 0;
  } catch (error) {
    console.error('Error getting following feed count:', error);
    return 0;
  }
}

export async function isFollowingAnyone(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_following_anyone', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data || false;
  } catch (error) {
    console.error('Error checking if following anyone:', error);
    return false;
  }
}

export async function getSuggestedUsersToFollow(
  userId: string,
  limit: number = 10
): Promise<SuggestedUser[]> {
  try {
    const { data, error } = await supabase.rpc('get_suggested_users_to_follow', {
      p_user_id: userId,
      result_limit: limit,
    });

    if (error) throw error;

    return (data || []) as SuggestedUser[];
  } catch (error) {
    console.error('Error getting suggested users:', error);
    return [];
  }
}

export async function getFollowingCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error('Error getting following count:', error);
    return 0;
  }
}

export function subscribeToFollowingFeed(
  userId: string,
  callback: (post: FeedPost) => void
) {
  const channel = supabase
    .channel(`following_feed_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'community_posts',
      },
      async (payload) => {
        const { data } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('following_id', payload.new.author_id)
          .single();

        if (data) {
          const posts = await getFollowingFeed(userId, 1, 0);
          if (posts.length > 0) {
            callback(posts[0]);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
