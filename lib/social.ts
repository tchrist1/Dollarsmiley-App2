import { supabase } from './supabase';

export interface CommunityPost {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  post_type: 'update' | 'showcase' | 'question' | 'tip' | 'achievement';
  listing_id?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: any;
  listing?: any;
  is_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id?: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  author?: any;
  is_liked?: boolean;
  replies?: PostComment[];
}

export interface FeedActivity {
  activity_id: string;
  activity_type: string;
  created_at: string;
  post_data?: any;
  user_data?: any;
}

export interface FollowSuggestion {
  profile_id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  rating_average: number;
  total_bookings: number;
  mutual_followers_count: number;
}

export async function followUser(followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('follows').insert({
      following_id: followingId,
    });

    return !error;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
}

export async function unfollowUser(followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('following_id', followingId);

    return !error;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
}

export async function isFollowing(userId: string, targetUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
      .maybeSingle();

    return !error && data !== null;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

export async function getFollowers(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower:profiles!follows_follower_id_fkey(*)')
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map((item: any) => item.follower);
  } catch (error) {
    console.error('Error fetching followers:', error);
    return [];
  }
}

export async function getFollowing(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following:profiles!follows_following_id_fkey(*)')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map((item: any) => item.following);
  } catch (error) {
    console.error('Error fetching following:', error);
    return [];
  }
}

export async function getFollowSuggestions(
  userId: string,
  limit: number = 10
): Promise<FollowSuggestion[]> {
  try {
    const { data, error } = await supabase.rpc('get_follow_suggestions', {
      p_user_id: userId,
      p_limit: limit,
    });

    return data || [];
  } catch (error) {
    console.error('Error fetching follow suggestions:', error);
    return [];
  }
}

export interface PostLocation {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

export async function createPost(
  content: string,
  postType: CommunityPost['post_type'] = 'update',
  mediaUrls: string[] = [],
  listingId?: string,
  mentionedUserIds: string[] = [],
  location?: PostLocation
): Promise<CommunityPost | null> {
  try {
    const postData: any = {
      content,
      post_type: postType,
      media_urls: mediaUrls,
      listing_id: listingId,
    };

    if (location) {
      postData.location_name = location.name;
      postData.location_latitude = location.latitude;
      postData.location_longitude = location.longitude;
      postData.location_data = {
        address: location.address,
        city: location.city,
        country: location.country,
      };
    }

    const { data, error } = await supabase
      .from('community_posts')
      .insert(postData)
      .select('*, author:profiles!profile_id(*)')
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return null;
    }

    if (data && mentionedUserIds.length > 0) {
      await createPostMentions(data.id, mentionedUserIds);
    }

    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    return null;
  }
}

export async function createPostMentions(
  postId: string,
  mentionedUserIds: string[]
): Promise<boolean> {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) return false;

    const mentions = mentionedUserIds.map((userId) => ({
      post_id: postId,
      mentioned_user_id: userId,
      mentioned_by_id: currentUser.user.id,
    }));

    const { error } = await supabase.from('post_mentions').insert(mentions);

    return !error;
  } catch (error) {
    console.error('Error creating post mentions:', error);
    return false;
  }
}

export async function getPostMentions(postId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('post_mentions')
      .select('mentioned_user:profiles!post_mentions_mentioned_user_id_fkey(*)')
      .eq('post_id', postId);

    if (error) return [];

    return data.map((item: any) => item.mentioned_user);
  } catch (error) {
    console.error('Error fetching post mentions:', error);
    return [];
  }
}

export async function searchUsersForMentions(
  query: string,
  currentUserId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('search_users_for_mentions', {
      search_query: query,
      current_user_id: currentUserId,
      result_limit: limit,
    });

    return data || [];
  } catch (error) {
    console.error('Error searching users for mentions:', error);
    return [];
  }
}

export async function getNearbyPosts(
  latitude: number,
  longitude: number,
  radiusKm: number = 50,
  limit: number = 20
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_nearby_posts', {
      user_lat: latitude,
      user_lng: longitude,
      radius_km: radiusKm,
      result_limit: limit,
    });

    return data || [];
  } catch (error) {
    console.error('Error fetching nearby posts:', error);
    return [];
  }
}

export async function searchPostsByLocation(
  query: string,
  limit: number = 20
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('search_posts_by_location', {
      search_query: query,
      result_limit: limit,
    });

    return data || [];
  } catch (error) {
    console.error('Error searching posts by location:', error);
    return [];
  }
}

export async function deletePost(postId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('community_posts').delete().eq('id', postId);

    return !error;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
}

export async function likePost(postId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('post_likes').insert({
      post_id: postId,
    });

    return !error;
  } catch (error) {
    console.error('Error liking post:', error);
    return false;
  }
}

export async function unlikePost(postId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId);

    return !error;
  } catch (error) {
    console.error('Error unliking post:', error);
    return false;
  }
}

export async function isPostLiked(userId: string, postId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    return !error && data !== null;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
}

export async function getFeed(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<FeedActivity[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_feed', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });

    return data || [];
  } catch (error) {
    console.error('Error fetching feed:', error);
    return [];
  }
}

export async function getCommunityPosts(
  limit: number = 20,
  offset: number = 0,
  postType?: string
): Promise<CommunityPost[]> {
  try {
    let query = supabase
      .from('community_posts')
      .select(
        `
        *,
        author:profiles!author_id(*)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postType) {
      query = query.eq('post_type', postType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export async function getUserPosts(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<CommunityPost[]> {
  try {
    const { data, error} = await supabase
      .from('community_posts')
      .select(
        `
        *,
        author:profiles!author_id(*)
      `
      )
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return [];
    return data || [];
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return [];
  }
}

export async function createComment(
  postId: string,
  content: string,
  parentCommentId?: string
): Promise<PostComment | null> {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        content,
        parent_comment_id: parentCommentId,
      })
      .select('*, author:profiles!post_comments_author_id_fkey(*)')
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating comment:', error);
    return null;
  }
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*, author:profiles!post_comments_author_id_fkey(*)')
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) return [];

    const comments = data || [];

    for (const comment of comments) {
      const { data: replies } = await supabase
        .from('post_comments')
        .select('*, author:profiles!post_comments_author_id_fkey(*)')
        .eq('parent_comment_id', comment.id)
        .order('created_at', { ascending: true });

      comment.replies = replies || [];
    }

    return comments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function likeComment(commentId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('comment_likes').insert({
      comment_id: commentId,
    });

    return !error;
  } catch (error) {
    console.error('Error liking comment:', error);
    return false;
  }
}

export async function unlikeComment(commentId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId);

    return !error;
  } catch (error) {
    console.error('Error unliking comment:', error);
    return false;
  }
}

export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);

    return !error;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}
