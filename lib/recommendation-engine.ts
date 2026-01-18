import { supabase } from './supabase';

export type InteractionType =
  | 'view'
  | 'like'
  | 'bookmark'
  | 'share'
  | 'contact'
  | 'book'
  | 'review'
  | 'follow'
  | 'comment';

export type ItemType = 'provider' | 'job' | 'post' | 'listing';

export type RecommendationType = 'providers' | 'jobs' | 'posts' | 'similar_users' | 'trending';

export type RecommendationAlgorithm = 'content_based' | 'collaborative' | 'hybrid';

export interface UserPreferences {
  id: string;
  user_id: string;
  categories: string[];
  location_radius_km: number;
  price_range_min: number;
  price_range_max?: number;
  preferred_providers: string[];
  blocked_providers: string[];
  feature_weights: Record<string, number>;
  updated_at: string;
}

export interface SimilarityScore {
  id: string;
  item_type: ItemType;
  item_id: string;
  similar_item_id: string;
  similarity_score: number;
  algorithm: RecommendationAlgorithm;
  features: Record<string, any>;
  created_at: string;
}

export interface UserInteraction {
  id: string;
  user_id: string;
  item_type: ItemType;
  item_id: string;
  interaction_type: InteractionType;
  interaction_weight: number;
  timestamp: string;
  context: Record<string, any>;
}

export interface Recommendation {
  provider_id: string;
  provider_name: string;
  category_name: string;
  recommendation_score: number;
  recommendation_reason: string;
}

export interface RecommendationCache {
  id: string;
  user_id: string;
  recommendation_type: RecommendationType;
  recommendations: any[];
  algorithm_used: string;
  generated_at: string;
  expires_at: string;
  metadata: Record<string, any>;
}

// Get or create user preferences
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    // Create default preferences if none exist
    if (!data) {
      const { data: newPrefs, error: insertError } = await supabase
        .from('user_preferences')
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) throw insertError;
      return newPrefs;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}

// Update user preferences
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user preferences:', error);
    return { success: false, error: error.message };
  }
}

// Record user interaction
export async function recordInteraction(
  userId: string,
  itemType: ItemType,
  itemId: string,
  interactionType: InteractionType,
  context?: Record<string, any>
): Promise<{ success: boolean; interactionId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('record_user_interaction', {
      p_user_id: userId,
      p_item_type: itemType,
      p_item_id: itemId,
      p_interaction_type: interactionType,
      p_context: context || {},
    });

    if (error) throw error;

    return { success: true, interactionId: data };
  } catch (error: any) {
    console.error('Error recording interaction:', error);
    return { success: false, error: error.message };
  }
}

// Get personalized provider recommendations
export async function getPersonalizedProviderRecommendations(
  userId: string,
  limit: number = 10,
  useCache: boolean = true
): Promise<Recommendation[]> {
  try {
    // Check cache first
    if (useCache) {
      const cached = await getRecommendationCache(userId, 'providers');
      if (cached) {
        return cached.recommendations as Recommendation[];
      }
    }

    // Generate new recommendations
    const { data, error } = await supabase.rpc('get_personalized_recommendations', {
      p_user_id: userId,
      p_recommendation_type: 'providers',
      p_limit: limit,
    });

    if (error) throw error;

    // Cache the results
    if (data && data.length > 0) {
      await cacheRecommendations(userId, 'providers', data, 'hybrid', 60 * 60); // 1 hour
    }

    return data || [];
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return [];
  }
}

// Get similar items
export async function getSimilarItems(
  itemType: ItemType,
  itemId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    if (itemType === 'provider') {
      const { data, error } = await supabase.rpc('calculate_provider_similarity', {
        p_provider_id: itemId,
        p_limit: limit,
      });

      if (error) throw error;
      return data || [];
    }

    return [];
  } catch (error) {
    console.error('Error getting similar items:', error);
    return [];
  }
}

// Get collaborative filtering recommendations
export async function getCollaborativeRecommendations(
  userId: string,
  itemType: ItemType,
  limit: number = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_collaborative_recommendations', {
      p_user_id: userId,
      p_item_type: itemType,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting collaborative recommendations:', error);
    return [];
  }
}

// Get user's interaction history
export async function getUserInteractionHistory(
  userId: string,
  itemType?: ItemType,
  limit: number = 50
): Promise<UserInteraction[]> {
  try {
    let query = supabase
      .from('user_item_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching interaction history:', error);
    return [];
  }
}

// Get recommendation cache
export async function getRecommendationCache(
  userId: string,
  recommendationType: RecommendationType
): Promise<RecommendationCache | null> {
  try {
    const { data, error } = await supabase
      .from('recommendation_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('recommendation_type', recommendationType)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching recommendation cache:', error);
    return null;
  }
}

// Cache recommendations
export async function cacheRecommendations(
  userId: string,
  recommendationType: RecommendationType,
  recommendations: any[],
  algorithm: string,
  ttlSeconds: number = 3600,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);

    const { error } = await supabase.from('recommendation_cache').upsert({
      user_id: userId,
      recommendation_type: recommendationType,
      recommendations,
      algorithm_used: algorithm,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      metadata: metadata || {},
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error caching recommendations:', error);
    return { success: false, error: error.message };
  }
}

// Clear recommendation cache
export async function clearRecommendationCache(
  userId: string,
  recommendationType?: RecommendationType
): Promise<{ success: boolean; error?: string }> {
  try {
    let query = supabase.from('recommendation_cache').delete().eq('user_id', userId);

    if (recommendationType) {
      query = query.eq('recommendation_type', recommendationType);
    }

    const { error } = await query;

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return { success: false, error: error.message };
  }
}

// Update similarity scores for an item
export async function updateSimilarityScores(
  itemType: ItemType,
  itemId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('update_similarity_scores', {
      p_item_type: itemType,
      p_item_id: itemId,
    });

    if (error) throw error;

    return { success: true, count: data };
  } catch (error: any) {
    console.error('Error updating similarity scores:', error);
    return { success: false, error: error.message };
  }
}

// Get trending items based on recent interactions
export async function getTrendingItems(
  itemType: ItemType,
  limit: number = 10,
  hoursAgo: number = 24
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_items', {
      p_item_type: itemType,
      p_hours_ago: hoursAgo,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting trending items:', error);
    return [];
  }
}

// Add item to user preferences (favorites)
export async function addToFavorites(
  userId: string,
  providerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const prefs = await getUserPreferences(userId);
    if (!prefs) {
      return { success: false, error: 'User preferences not found' };
    }

    const preferredProviders = prefs.preferred_providers || [];
    if (!preferredProviders.includes(providerId)) {
      preferredProviders.push(providerId);

      const { error } = await supabase
        .from('user_preferences')
        .update({ preferred_providers: preferredProviders })
        .eq('user_id', userId);

      if (error) throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error adding to favorites:', error);
    return { success: false, error: error.message };
  }
}

// Remove item from user preferences (favorites)
export async function removeFromFavorites(
  userId: string,
  providerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const prefs = await getUserPreferences(userId);
    if (!prefs) {
      return { success: false, error: 'User preferences not found' };
    }

    const preferredProviders = (prefs.preferred_providers || []).filter(
      (id) => id !== providerId
    );

    const { error } = await supabase
      .from('user_preferences')
      .update({ preferred_providers: preferredProviders })
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error removing from favorites:', error);
    return { success: false, error: error.message };
  }
}

// Block provider
export async function blockProvider(
  userId: string,
  providerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const prefs = await getUserPreferences(userId);
    if (!prefs) {
      return { success: false, error: 'User preferences not found' };
    }

    const blockedProviders = prefs.blocked_providers || [];
    if (!blockedProviders.includes(providerId)) {
      blockedProviders.push(providerId);

      const { error } = await supabase
        .from('user_preferences')
        .update({ blocked_providers: blockedProviders })
        .eq('user_id', userId);

      if (error) throw error;

      // Clear cache to reflect blocked provider
      await clearRecommendationCache(userId, 'providers');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error blocking provider:', error);
    return { success: false, error: error.message };
  }
}

// Helper: Get interaction weight for display
export function getInteractionWeight(interactionType: InteractionType): number {
  const weights: Record<InteractionType, number> = {
    view: 1.0,
    like: 3.0,
    bookmark: 4.0,
    share: 5.0,
    contact: 6.0,
    book: 10.0,
    review: 8.0,
    follow: 7.0,
    comment: 4.0,
  };
  return weights[interactionType] || 1.0;
}

// Helper: Format recommendation reason
export function formatRecommendationReason(reason: string): string {
  const reasons: Record<string, string> = {
    similar_to_viewed: 'Similar to providers you viewed',
    users_also_liked: 'Other users also liked',
    same_category: 'In your preferred category',
    trending: 'Trending now',
    nearby: 'Near your location',
    price_match: 'Within your budget',
  };
  return reasons[reason] || reason;
}

// Helper: Calculate recommendation confidence
export function calculateRecommendationConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

// Helper: Get confidence color
export function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  const colors = {
    high: '#059669',
    medium: '#F59E0B',
    low: '#EF4444',
  };
  return colors[confidence];
}
