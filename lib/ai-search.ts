import { supabase } from './supabase';

interface SearchOptions {
  query: string;
  type?: 'text' | 'voice' | 'image' | 'semantic';
  filters?: {
    category?: string;
    subcategory?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: { lat: number; lng: number; radius?: number };
    rating?: number;
    availability?: string;
  };
  userId?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  id: string;
  type: 'listing' | 'job' | 'provider';
  title: string;
  description: string;
  category?: string;
  subcategory?: string;
  price?: number;
  rating?: number;
  image_url?: string;
  relevance_score: number;
  matched_terms?: string[];
}

export class AISearchService {
  static async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    total: number;
    queryId: string;
  }> {
    const { query, type = 'text', filters = {}, userId, sessionId, limit = 20, offset = 0 } = options;

    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);

    let results: SearchResult[] = [];

    if (type === 'text' || type === 'semantic') {
      const listingResults = await this.searchListings(searchTerms, filters, limit, offset);
      results.push(...listingResults);
    }

    const { data: queryRecord } = await supabase
      .from('search_queries')
      .insert({
        user_id: userId,
        query_text: query,
        query_type: type,
        filters,
        result_count: results.length,
        session_id: sessionId,
        location_lat: filters.location?.lat,
        location_lng: filters.location?.lng,
      })
      .select()
      .single();

    await supabase.rpc('update_search_suggestion_popularity', {
      suggestion_text_param: query,
      category_param: filters.category || null,
    });

    return {
      results,
      total: results.length,
      queryId: queryRecord?.id || '',
    };
  }

  private static async searchListings(
    searchTerms: string[],
    filters: any,
    limit: number,
    offset: number
  ): Promise<SearchResult[]> {
    let query = supabase
      .from('listings')
      .select('id, title, description, category, subcategory, price, provider_id, images, status')
      .eq('status', 'active');

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.subcategory) {
      query = query.eq('subcategory', filters.subcategory);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    const { data: listings } = await query
      .range(offset, offset + limit - 1);

    if (!listings) return [];

    return listings
      .map(listing => {
        const titleMatch = this.calculateTextRelevance(searchTerms, listing.title);
        const descMatch = this.calculateTextRelevance(searchTerms, listing.description);
        const relevanceScore = titleMatch * 2 + descMatch;

        return {
          id: listing.id,
          type: 'listing' as const,
          title: listing.title,
          description: listing.description,
          category: listing.category,
          subcategory: listing.subcategory,
          price: listing.price,
          image_url: listing.images?.[0],
          relevance_score: relevanceScore,
          matched_terms: searchTerms.filter(term =>
            listing.title.toLowerCase().includes(term) ||
            listing.description.toLowerCase().includes(term)
          ),
        };
      })
      .filter(r => r.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score);
  }

  private static calculateTextRelevance(searchTerms: string[], text: string): number {
    const lowerText = text.toLowerCase();
    let score = 0;

    for (const term of searchTerms) {
      if (lowerText.includes(term)) {
        const exactMatch = lowerText.split(' ').includes(term);
        score += exactMatch ? 2 : 1;
      }
    }

    return score;
  }

  static async getSuggestions(userId: string, prefix: string, limit: number = 10) {
    const { data } = await supabase.rpc('get_personalized_suggestions', {
      user_id_param: userId,
      query_prefix: prefix,
      limit_param: limit,
    });

    return data || [];
  }

  static async getTrendingSearches(hours: number = 24, limit: number = 10) {
    const { data } = await supabase.rpc('get_trending_searches', {
      hours_param: hours,
      limit_param: limit,
    });

    return data || [];
  }

  static async trackResultClick(
    queryId: string,
    resultId: string,
    resultType: string,
    position: number
  ) {
    await supabase.rpc('track_search_click', {
      query_id_param: queryId,
      result_id_param: resultId,
      result_type_param: resultType,
      position_param: position,
    });
  }

  static async getUserSearchHistory(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('search_queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getSearchAnalytics(userId?: string, days: number = 30) {
    const { data } = await supabase.rpc('get_search_analytics', {
      user_id_param: userId || null,
      days_param: days,
    });

    return data?.[0] || null;
  }

  static async clearSearchHistory(userId: string) {
    const { error } = await supabase
      .from('search_queries')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  static highlightMatches(text: string, searchTerms: string[]): string {
    let highlighted = text;

    for (const term of searchTerms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }

    return highlighted;
  }

  static extractKeywords(query: string): string[] {
    const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or'];

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  static sortResults(
    results: SearchResult[],
    sortBy: 'relevance' | 'price_low' | 'price_high' | 'rating'
  ): SearchResult[] {
    const sorted = [...results];

    switch (sortBy) {
      case 'relevance':
        return sorted.sort((a, b) => b.relevance_score - a.relevance_score);
      case 'price_low':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price_high':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return sorted;
    }
  }

  static filterResults(results: SearchResult[], filters: any): SearchResult[] {
    return results.filter(result => {
      if (filters.category && result.category !== filters.category) return false;
      if (filters.minPrice && (result.price || 0) < filters.minPrice) return false;
      if (filters.maxPrice && (result.price || 0) > filters.maxPrice) return false;
      if (filters.rating && (result.rating || 0) < filters.rating) return false;
      return true;
    });
  }
}

export default AISearchService;
