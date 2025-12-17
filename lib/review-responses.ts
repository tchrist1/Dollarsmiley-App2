import { supabase } from './supabase';

export interface ReviewResponse {
  id: string;
  review_id: string;
  provider_id: string;
  response_text: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
}

export interface ReviewWithResponse {
  review: any;
  response?: ReviewResponse;
  media?: any[];
}

export interface ReviewNeedingResponse {
  review_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  booking_id: string;
  days_since_review: number;
}

export interface ReviewResponseStats {
  total_reviews: number;
  total_responses: number;
  response_rate: number;
  avg_response_time_hours: number;
  responses_edited: number;
  reviews_needing_response: number;
}

/**
 * Add a response to a review
 */
export async function addReviewResponse(
  reviewId: string,
  responseText: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('add_review_response', {
      review_id_param: reviewId,
      response_text_param: responseText.trim(),
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error adding review response:', error);
    throw new Error(error.message || 'Failed to add response');
  }
}

/**
 * Update an existing response
 */
export async function updateReviewResponse(
  responseId: string,
  responseText: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('update_review_response', {
      response_id_param: responseId,
      response_text_param: responseText.trim(),
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error updating review response:', error);
    throw new Error(error.message || 'Failed to update response');
  }
}

/**
 * Delete a response
 */
export async function deleteReviewResponse(responseId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('delete_review_response', {
      response_id_param: responseId,
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error deleting review response:', error);
    throw new Error(error.message || 'Failed to delete response');
  }
}

/**
 * Get a review with its response
 */
export async function getReviewWithResponse(reviewId: string): Promise<ReviewWithResponse | null> {
  try {
    const { data, error } = await supabase.rpc('get_review_with_response', {
      review_id_param: reviewId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting review with response:', error);
    return null;
  }
}

/**
 * Get reviews that need a response
 */
export async function getReviewsNeedingResponse(
  providerId?: string
): Promise<ReviewNeedingResponse[]> {
  try {
    const { data, error } = await supabase.rpc('get_reviews_needing_response', {
      provider_id_param: providerId,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting reviews needing response:', error);
    return [];
  }
}

/**
 * Get response statistics
 */
export async function getReviewResponseStats(
  providerId?: string
): Promise<ReviewResponseStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_review_response_stats', {
      provider_id_param: providerId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting response stats:', error);
    return null;
  }
}

/**
 * Get response for a specific review
 */
export async function getResponseForReview(reviewId: string): Promise<ReviewResponse | null> {
  try {
    const { data, error } = await supabase
      .from('review_responses')
      .select('*')
      .eq('review_id', reviewId)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting response for review:', error);
    return null;
  }
}

/**
 * Check if provider has responded to a review
 */
export async function hasProviderResponded(reviewId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('review_responses')
      .select('id')
      .eq('review_id', reviewId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return !!data;
  } catch (error) {
    console.error('Error checking response:', error);
    return false;
  }
}

/**
 * Get all responses by a provider
 */
export async function getProviderResponses(
  providerId: string,
  limit: number = 50
): Promise<ReviewResponse[]> {
  try {
    const { data, error } = await supabase
      .from('review_responses')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting provider responses:', error);
    return [];
  }
}

/**
 * Get reviews with responses (view)
 */
export async function getReviewsWithResponses(
  filters?: {
    providerId?: string;
    hasResponse?: boolean;
    limit?: number;
  }
): Promise<any[]> {
  try {
    let query = supabase.from('reviews_with_responses').select('*');

    if (filters?.providerId) {
      query = query.eq('reviewee_id', filters.providerId);
    }

    if (filters?.hasResponse !== undefined) {
      query = query.eq('has_response', filters.hasResponse);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting reviews with responses:', error);
    return [];
  }
}

/**
 * Calculate response rate for a provider
 */
export function calculateResponseRate(totalReviews: number, totalResponses: number): number {
  if (totalReviews === 0) return 0;
  return Math.round((totalResponses / totalReviews) * 100);
}

/**
 * Get response quality metrics
 */
export function analyzeResponseQuality(responseText: string): {
  length: number;
  hasGreeting: boolean;
  hasThank: boolean;
  hasQuestion: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
} {
  const text = responseText.toLowerCase();

  const positiveWords = ['thank', 'appreciate', 'glad', 'happy', 'pleased', 'great', 'excellent'];
  const negativeWords = ['sorry', 'apologize', 'unfortunately', 'regret'];

  const positiveCount = positiveWords.filter((word) => text.includes(word)).length;
  const negativeCount = negativeWords.filter((word) => text.includes(word)).length;

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';

  return {
    length: responseText.length,
    hasGreeting: /\b(hi|hello|hey|dear|greetings)\b/i.test(text),
    hasThank: /\b(thank|thanks|appreciate)\b/i.test(text),
    hasQuestion: responseText.includes('?'),
    sentiment,
  };
}

/**
 * Get response time category
 */
export function getResponseTimeCategory(hours: number): 'fast' | 'good' | 'slow' | 'very-slow' {
  if (hours < 24) return 'fast';
  if (hours < 72) return 'good';
  if (hours < 168) return 'slow';
  return 'very-slow';
}

/**
 * Format response time for display
 */
export function formatResponseTime(createdAt: string, respondedAt: string): string {
  const created = new Date(createdAt);
  const responded = new Date(respondedAt);
  const diffMs = responded.getTime() - created.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'within an hour';
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} later`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} later`;
  return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} later`;
}

/**
 * Validate response text
 */
export function validateResponseText(text: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = text.trim();
  const minLength = 10;
  const maxLength = 1000;

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `Response must be at least ${minLength} characters`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Response must not exceed ${maxLength} characters`,
    };
  }

  return { valid: true };
}

/**
 * Subscribe to review response changes
 */
export function subscribeToReviewResponses(
  callback: (payload: any) => void
) {
  return supabase
    .channel('review_responses_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'review_responses',
      },
      callback
    )
    .subscribe();
}

/**
 * Get suggested response templates
 */
export function getResponseTemplates(): Array<{
  title: string;
  template: string;
  useCase: string;
}> {
  return [
    {
      title: 'Positive Review',
      template:
        "Thank you so much for your wonderful review! I'm thrilled to hear you had a great experience. It was a pleasure working with you, and I look forward to serving you again in the future!",
      useCase: '5-star reviews',
    },
    {
      title: 'Good Review',
      template:
        "Thank you for taking the time to leave a review! I'm glad you were satisfied with my service. Your feedback means a lot to me, and I hope to work with you again soon.",
      useCase: '4-star reviews',
    },
    {
      title: 'Constructive Feedback',
      template:
        "Thank you for your honest feedback. I appreciate you bringing this to my attention. I'm always looking to improve my service, and your comments will help me do that. I hope to have the opportunity to serve you better in the future.",
      useCase: '3-star reviews',
    },
    {
      title: 'Negative Review',
      template:
        "I sincerely apologize for your experience. This is not the level of service I strive to provide. I'd like to discuss this further and make things right. Please feel free to reach out to me directly so we can resolve this matter.",
      useCase: '1-2 star reviews',
    },
    {
      title: 'Addressing Concerns',
      template:
        "Thank you for sharing your concerns. I take all feedback seriously and want to address your specific issues. [Explain what happened and how you'll prevent it]. I value your business and hope to regain your trust.",
      useCase: 'Reviews with specific complaints',
    },
  ];
}
