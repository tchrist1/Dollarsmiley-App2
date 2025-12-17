import { supabase } from './supabase';

export interface ShareResult {
  share_id: string;
  shares_count: number;
  success: boolean;
}

export interface ShareAnalytics {
  total_shares: number;
  share_method: string;
  method_count: number;
}

export interface ShareHistoryItem {
  share_id: string;
  post_id: string;
  share_method: string;
  shared_at: string;
  post_author: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  post_content: string;
}

export interface TrendingSharedPost {
  post_id: string;
  shares_count: number;
  recent_shares: number;
  post_content: string;
  author: {
    id: string;
    full_name: string;
    avatar_url?: string;
    is_verified: boolean;
  };
  created_at: string;
}

export async function recordPostShare(
  postId: string,
  shareMethod: string
): Promise<ShareResult> {
  try {
    const { data, error } = await supabase.rpc('record_post_share', {
      p_post_id: postId,
      p_share_method: shareMethod,
    });

    if (error) throw error;

    return data as ShareResult;
  } catch (error) {
    console.error('Error recording post share:', error);
    throw error;
  }
}

export async function getPostShareAnalytics(
  postId: string
): Promise<ShareAnalytics[]> {
  try {
    const { data, error } = await supabase.rpc('get_post_share_analytics', {
      p_post_id: postId,
    });

    if (error) throw error;

    return (data || []) as ShareAnalytics[];
  } catch (error) {
    console.error('Error getting share analytics:', error);
    return [];
  }
}

export async function getUserShareHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ShareHistoryItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_share_history', {
      p_user_id: userId,
      result_limit: limit,
      result_offset: offset,
    });

    if (error) throw error;

    return (data || []) as ShareHistoryItem[];
  } catch (error) {
    console.error('Error getting share history:', error);
    return [];
  }
}

export async function getTrendingSharedPosts(
  daysBack: number = 7,
  limit: number = 10
): Promise<TrendingSharedPost[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_shared_posts', {
      days_back: daysBack,
      result_limit: limit,
    });

    if (error) throw error;

    return (data || []) as TrendingSharedPost[];
  } catch (error) {
    console.error('Error getting trending shared posts:', error);
    return [];
  }
}

export async function getPostSharesCount(postId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('shares_count')
      .eq('id', postId)
      .single();

    if (error) throw error;

    return data?.shares_count || 0;
  } catch (error) {
    console.error('Error getting post shares count:', error);
    return 0;
  }
}

export async function getMostSharedPosts(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select(
        `
        id,
        content,
        shares_count,
        created_at,
        author:profiles!profile_id(
          id,
          full_name,
          avatar_url,
          is_verified
        )
      `
      )
      .order('shares_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting most shared posts:', error);
    return [];
  }
}

export function subscribeToPostShares(
  postId: string,
  callback: (sharesCount: number) => void
) {
  const channel = supabase
    .channel(`post_shares_${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'post_shares',
        filter: `post_id=eq.${postId}`,
      },
      async () => {
        const count = await getPostSharesCount(postId);
        callback(count);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
