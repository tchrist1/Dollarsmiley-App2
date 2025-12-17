import { supabase } from './supabase';
import type { JobFilters } from '@/components/FilterModal';

/**
 * Job Search Service
 * Handles job searching with text queries and filters
 */

export interface SearchParams {
  query?: string;
  filters?: JobFilters;
  userId?: string;
  userType?: 'customer' | 'provider';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  location: string;
  estimated_budget?: number;
  execution_date_start?: string;
  execution_date_end?: string;
  preferred_time?: string;
  status: string;
  created_at: string;
  category: {
    id: string;
    name: string;
    icon?: string;
  };
  customer: {
    id: string;
    full_name: string;
    avatar_url?: string;
    rating_average?: number;
  };
  quotes_count?: number;
  distance?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
}

/**
 * Search jobs with text query and filters
 */
export async function searchJobs(params: SearchParams): Promise<SearchResponse> {
  const {
    query,
    filters,
    userId,
    userType = 'provider',
    limit = 20,
    offset = 0,
  } = params;

  try {
    // Build base query
    let queryBuilder = supabase
      .from('jobs')
      .select(
        `
        id,
        title,
        description,
        location,
        estimated_budget,
        execution_date_start,
        execution_date_end,
        preferred_time,
        status,
        created_at,
        category:categories!jobs_category_id_fkey(
          id,
          name,
          icon
        ),
        customer:profiles!jobs_customer_id_fkey(
          id,
          full_name,
          avatar_url,
          rating_average
        )
      `,
        { count: 'exact' }
      );

    // Filter by status (providers see Open jobs, customers see their own)
    if (userType === 'provider') {
      queryBuilder = queryBuilder.eq('status', 'Open');
    } else if (userId) {
      queryBuilder = queryBuilder.eq('customer_id', userId);
    }

    // Text search across title and description
    if (query && query.trim().length > 0) {
      const searchTerm = query.trim();

      // Use Postgres full-text search if available
      // Otherwise fall back to ILIKE
      queryBuilder = queryBuilder.or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    // Apply filters
    if (filters) {
      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        queryBuilder = queryBuilder.in('category_id', filters.categories);
      }

      // Price range filter
      if (filters.minPrice !== undefined) {
        queryBuilder = queryBuilder.gte('estimated_budget', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        queryBuilder = queryBuilder.lte('estimated_budget', filters.maxPrice);
      }

      // Date range filter
      if (filters.startDate) {
        queryBuilder = queryBuilder.gte(
          'execution_date_start',
          filters.startDate.toISOString().split('T')[0]
        );
      }
      if (filters.endDate) {
        queryBuilder = queryBuilder.lte(
          'execution_date_start',
          filters.endDate.toISOString().split('T')[0]
        );
      }

      // Location filter (simple text match for now)
      if (filters.location && filters.location.trim().length > 0) {
        queryBuilder = queryBuilder.ilike('location', `%${filters.location.trim()}%`);
      }

      // Sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'relevance':
            // Default: most recent, then by status
            queryBuilder = queryBuilder.order('created_at', { ascending: false });
            break;
          case 'price_low':
            queryBuilder = queryBuilder.order('estimated_budget', { ascending: true });
            break;
          case 'price_high':
            queryBuilder = queryBuilder.order('estimated_budget', { ascending: false });
            break;
          case 'rating':
            // Sort by customer rating (descending)
            queryBuilder = queryBuilder.order('created_at', { ascending: false });
            break;
          case 'distance':
            // Distance sorting requires location coordinates
            // For now, sort by location text similarity
            queryBuilder = queryBuilder.order('created_at', { ascending: false });
            break;
          case 'popular':
            // Most quotes = most popular
            queryBuilder = queryBuilder.order('created_at', { ascending: false });
            break;
          case 'reviews':
            // Most reviewed customers
            queryBuilder = queryBuilder.order('created_at', { ascending: false });
            break;
          case 'recent':
            queryBuilder = queryBuilder.order('created_at', { ascending: false });
            break;
          default:
            queryBuilder = queryBuilder.order('created_at', { ascending: false });
        }
      } else {
        // Default sort by most recent
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
      }
    } else {
      // Default sort
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Search error:', error);
      return {
        results: [],
        total: 0,
        hasMore: false,
      };
    }

    return {
      results: (data || []) as SearchResult[],
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
    };
  } catch (error) {
    console.error('Search exception:', error);
    return {
      results: [],
      total: 0,
      hasMore: false,
    };
  }
}

export interface EnhancedSearchSuggestion {
  text: string;
  type: 'job' | 'category' | 'location' | 'keyword';
  icon?: string;
  category?: string;
  count?: number;
}

/**
 * Get enhanced search suggestions with categories, locations, and job titles
 */
export async function getEnhancedSearchSuggestions(
  query: string
): Promise<EnhancedSearchSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = query.trim();
  const suggestions: EnhancedSearchSuggestion[] = [];

  try {
    // Get matching categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, icon')
      .ilike('name', `%${searchTerm}%`)
      .limit(3);

    if (categories) {
      for (const cat of categories) {
        const { count } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id)
          .eq('status', 'Open');

        suggestions.push({
          text: cat.name,
          type: 'category',
          icon: cat.icon,
          count: count || 0,
        });
      }
    }

    // Get matching job titles
    const { data: jobs } = await supabase
      .from('jobs')
      .select(
        `
        title,
        category:categories!jobs_category_id_fkey(name)
      `
      )
      .ilike('title', `%${searchTerm}%`)
      .eq('status', 'Open')
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobs) {
      const uniqueTitles = Array.from(new Set(jobs.map((job) => job.title)));
      uniqueTitles.forEach((title) => {
        const job = jobs.find((j) => j.title === title);
        suggestions.push({
          text: title,
          type: 'job',
          category: job?.category?.name,
        });
      });
    }

    // Get matching locations
    const { data: locations } = await supabase
      .from('jobs')
      .select('location')
      .ilike('location', `%${searchTerm}%`)
      .eq('status', 'Open')
      .limit(3);

    if (locations) {
      const uniqueLocations = Array.from(new Set(locations.map((l) => l.location)));
      uniqueLocations.forEach((location) => {
        if (location) {
          suggestions.push({
            text: location,
            type: 'location',
          });
        }
      });
    }

    return suggestions.slice(0, 10);
  } catch (error) {
    console.error('Error getting enhanced suggestions:', error);
    return [];
  }
}

/**
 * Get search suggestions based on partial query (simple version)
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // Get recent job titles matching the query
    const { data, error } = await supabase
      .from('jobs')
      .select('title')
      .ilike('title', `%${query.trim()}%`)
      .eq('status', 'Open')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !data) {
      return [];
    }

    // Extract unique titles
    const suggestions = Array.from(new Set(data.map((job) => job.title)));
    return suggestions;
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
}

/**
 * Get popular search terms
 */
export async function getPopularSearches(): Promise<string[]> {
  try {
    // Get most common job categories
    const { data, error } = await supabase
      .from('jobs')
      .select('title')
      .eq('status', 'Open')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) {
      return ['Plumbing', 'Electrical', 'Cleaning', 'Moving', 'Lawn Care'];
    }

    // Extract common keywords (simplified version)
    const keywords = data
      .flatMap((job) => job.title.toLowerCase().split(' '))
      .filter((word) => word.length > 3);

    // Count frequency
    const frequency: Record<string, number> = {};
    keywords.forEach((word) => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Get top 5
    const popular = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return popular.length > 0
      ? popular
      : ['Plumbing', 'Electrical', 'Cleaning', 'Moving', 'Lawn Care'];
  } catch (error) {
    console.error('Error getting popular searches:', error);
    return ['Plumbing', 'Electrical', 'Cleaning', 'Moving', 'Lawn Care'];
  }
}

export interface SearchHistoryEntry {
  id: string;
  user_id: string | null;
  search_query: string;
  filters_applied?: JobFilters;
  results_count?: number;
  clicked_listing_id?: string | null;
  created_at: string;
}

/**
 * Save search to history with results count
 */
export async function saveSearchHistory(
  userId: string | null,
  query: string,
  resultsCount: number = 0,
  filters?: JobFilters
): Promise<boolean> {
  if (!query.trim()) {
    return false;
  }

  try {
    const { error } = await supabase.from('search_history').insert({
      user_id: userId,
      search_query: query.trim(),
      filters_applied: filters || {},
      results_count: resultsCount,
    });

    if (error) {
      console.error('Error saving search history:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving search history:', error);
    return false;
  }
}

/**
 * Get user's search history with full details
 */
export async function getSearchHistory(
  userId: string,
  limit: number = 10
): Promise<SearchHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data as SearchHistoryEntry[];
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
}

/**
 * Get recent search queries (unique, text only)
 */
export async function getRecentSearchQueries(
  userId: string,
  limit: number = 10
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('search_query')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (error || !data) {
      return [];
    }

    const uniqueQueries = Array.from(
      new Set(data.map((item) => item.search_query))
    ).slice(0, limit);

    return uniqueQueries;
  } catch (error) {
    console.error('Error getting recent search queries:', error);
    return [];
  }
}

/**
 * Clear all search history for a user
 */
export async function clearSearchHistory(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Error clearing search history:', error);
    return false;
  }
}

/**
 * Delete a specific search history entry
 */
export async function deleteSearchHistoryEntry(
  userId: string,
  entryId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Error deleting search history entry:', error);
    return false;
  }
}

/**
 * Update search history entry with clicked listing
 */
export async function updateSearchHistoryClick(
  userId: string,
  entryId: string,
  listingId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('search_history')
      .update({ clicked_listing_id: listingId })
      .eq('id', entryId)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Error updating search history click:', error);
    return false;
  }
}

/**
 * Get most popular searches from all users
 */
export async function getPopularSearchTerms(limit: number = 10): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('popular_searches')
      .select('search_term, search_count')
      .order('search_count', { ascending: false })
      .order('last_searched_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return ['Plumbing', 'Electrical', 'Cleaning', 'Moving', 'Lawn Care'];
    }

    return data.map((item) => item.search_term);
  } catch (error) {
    console.error('Error getting popular search terms:', error);
    return ['Plumbing', 'Electrical', 'Cleaning', 'Moving', 'Lawn Care'];
  }
}

/**
 * Increment popular search count or create new entry
 */
export async function trackPopularSearch(searchTerm: string): Promise<void> {
  if (!searchTerm.trim()) {
    return;
  }

  try {
    const term = searchTerm.trim().toLowerCase();

    const { data: existing } = await supabase
      .from('popular_searches')
      .select('id, search_count')
      .eq('search_term', term)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('popular_searches')
        .update({
          search_count: existing.search_count + 1,
          last_searched_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('popular_searches').insert({
        search_term: term,
        search_count: 1,
        last_searched_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error tracking popular search:', error);
  }
}

/**
 * Get search analytics
 */
export async function getSearchAnalytics(userId: string) {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('query, filters, searched_at')
      .eq('user_id', userId);

    if (error || !data) {
      return null;
    }

    const totalSearches = data.length;
    const uniqueQueries = new Set(data.map((item) => item.query)).size;
    const withFilters = data.filter((item) => item.filters).length;

    // Get most searched terms
    const queryCounts: Record<string, number> = {};
    data.forEach((item) => {
      queryCounts[item.query] = (queryCounts[item.query] || 0) + 1;
    });

    const topSearches = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    return {
      totalSearches,
      uniqueQueries,
      withFilters,
      filterUsageRate: totalSearches > 0 ? (withFilters / totalSearches) * 100 : 0,
      topSearches,
    };
  } catch (error) {
    console.error('Error getting search analytics:', error);
    return null;
  }
}

/**
 * Build search query string for display
 */
export function buildSearchQueryString(params: SearchParams): string {
  const parts: string[] = [];

  if (params.query) {
    parts.push(`"${params.query}"`);
  }

  if (params.filters) {
    const { categories, minPrice, maxPrice, startDate, endDate, location } = params.filters;

    if (categories && categories.length > 0) {
      parts.push(`in ${categories.join(', ')}`);
    }

    if (minPrice || maxPrice) {
      if (minPrice && maxPrice) {
        parts.push(`$${minPrice}-$${maxPrice}`);
      } else if (minPrice) {
        parts.push(`$${minPrice}+`);
      } else if (maxPrice) {
        parts.push(`under $${maxPrice}`);
      }
    }

    if (startDate || endDate) {
      if (startDate && endDate) {
        parts.push(
          `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        );
      } else if (startDate) {
        parts.push(
          `from ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        );
      } else if (endDate) {
        parts.push(
          `until ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        );
      }
    }

    if (location) {
      parts.push(`near ${location}`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : 'All jobs';
}
