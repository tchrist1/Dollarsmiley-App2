import { supabase } from './supabase';

export interface SubcategoryMatch {
  subcategory_id: string;
  subcategory_name: string;
  category_id: string;
  category_name: string;
  similarity_score: number;
  matched_keywords: string[];
}

export interface CategorySuggestionResponse {
  suggested_category_id: string;
  suggested_category_name: string;
  suggested_subcategory_id: string;
  suggested_subcategory_name: string;
  confidence_score: number;
  alternate_suggestions: SubcategoryMatch[];
}

export async function suggestCategory(
  title: string,
  description: string
): Promise<{ data: CategorySuggestionResponse | null; error: string | null }> {
  try {
    if (!title && !description) {
      return {
        data: null,
        error: 'Either title or description is required',
      };
    }

    const { data, error } = await supabase.functions.invoke('suggest-listing-category', {
      body: { title, description },
    });

    if (error) {
      console.error('AI suggestion error:', error);
      return {
        data: null,
        error: error.message || 'Failed to get AI suggestion',
      };
    }

    if (!data) {
      return {
        data: null,
        error: 'No response from AI service',
      };
    }

    if (data.error) {
      return {
        data: null,
        error: data.error,
      };
    }

    return {
      data: data as CategorySuggestionResponse,
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error in suggestCategory:', err);
    return {
      data: null,
      error: err.message || 'An unexpected error occurred',
    };
  }
}

export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

export function getConfidenceColor(score: number): string {
  if (score >= 0.7) return '#10B981';
  if (score >= 0.4) return '#F59E0B';
  return '#EF4444';
}

export function formatConfidencePercentage(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

export async function trackSuggestionUsage(
  userId: string,
  accepted: boolean,
  suggestedCategoryId: string,
  suggestedSubcategoryId: string,
  confidenceScore: number,
  actualCategoryId?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('ai_recommendation_tracking').insert({
      user_id: userId,
      recommendation_type: 'category_suggestion',
      accepted,
      suggested_item_id: suggestedSubcategoryId,
      confidence_score: confidenceScore,
      actual_item_id: actualCategoryId || null,
      metadata: {
        suggested_category_id: suggestedCategoryId,
        suggested_subcategory_id: suggestedSubcategoryId,
      },
    });

    if (error) {
      console.error('Error tracking suggestion usage:', error);
    }
  } catch (err) {
    console.error('Unexpected error tracking suggestion:', err);
  }
}

export function extractRelevantKeywords(text: string): string[] {
  const stopWords = [
    'the',
    'a',
    'an',
    'in',
    'on',
    'at',
    'for',
    'to',
    'of',
    'and',
    'or',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
  ];

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word))
    .filter((word, index, self) => self.indexOf(word) === index)
    .slice(0, 10);
}
