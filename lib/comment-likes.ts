import { supabase } from './supabase';

export interface CommentLikeResult {
  is_liked: boolean;
  likes_count: number;
}

export async function toggleCommentLike(commentId: string): Promise<CommentLikeResult> {
  try {
    const { data, error } = await supabase.rpc('toggle_comment_like', {
      p_comment_id: commentId,
    });

    if (error) throw error;

    return data as CommentLikeResult;
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw error;
  }
}

export async function checkCommentLiked(commentId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_comment_liked', {
      p_comment_id: commentId,
      p_user_id: userId,
    });

    if (error) throw error;

    return data as boolean;
  } catch (error) {
    console.error('Error checking comment liked:', error);
    return false;
  }
}

export async function getUserLikedComments(
  postId: string,
  userId: string
): Promise<Set<string>> {
  try {
    const { data, error } = await supabase.rpc('get_user_liked_comments', {
      p_post_id: postId,
      p_user_id: userId,
    });

    if (error) throw error;

    const likedIds = (data || []).map((item: any) => item.comment_id);
    return new Set(likedIds);
  } catch (error) {
    console.error('Error getting user liked comments:', error);
    return new Set();
  }
}

export async function getCommentLikesCount(commentId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    if (error) throw error;

    return data?.likes_count || 0;
  } catch (error) {
    console.error('Error getting comment likes count:', error);
    return 0;
  }
}

export async function getCommentWithLikes(commentId: string, userId?: string) {
  try {
    const { data: comment, error } = await supabase
      .from('post_comments')
      .select(
        `
        *,
        author:profiles!post_comments_author_id_fkey(
          id,
          full_name,
          avatar_url,
          user_type,
          is_verified
        )
      `
      )
      .eq('id', commentId)
      .single();

    if (error) throw error;

    let isLiked = false;
    if (userId) {
      isLiked = await checkCommentLiked(commentId, userId);
    }

    return {
      ...comment,
      is_liked: isLiked,
    };
  } catch (error) {
    console.error('Error getting comment with likes:', error);
    throw error;
  }
}

export function subscribeToCommentLikes(
  commentId: string,
  callback: (likesCount: number) => void
) {
  const channel = supabase
    .channel(`comment_likes_${commentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comment_likes',
        filter: `comment_id=eq.${commentId}`,
      },
      async () => {
        const count = await getCommentLikesCount(commentId);
        callback(count);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
