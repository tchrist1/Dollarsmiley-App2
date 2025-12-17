import { supabase } from './supabase';

export type SearchType = 'providers' | 'jobs' | 'services' | 'listings';
export type NotificationFrequency = 'instant' | 'daily' | 'weekly' | 'never';

export interface SearchCriteria {
  category?: string;
  location?: string;
  min_rating?: number;
  max_rate?: number;
  min_budget?: number;
  max_budget?: number;
  keywords?: string[];
  radius?: number;
  availability?: string;
  [key: string]: any;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  search_type: SearchType;
  search_criteria: SearchCriteria;
  notification_enabled: boolean;
  notification_frequency: NotificationFrequency;
  last_notified_at?: string;
  match_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchMatch {
  id: string;
  saved_search_id: string;
  match_type: string;
  match_id: string;
  match_score: number;
  is_new: boolean;
  notified: boolean;
  created_at: string;
}

export interface SearchNotification {
  id: string;
  saved_search_id: string;
  user_id: string;
  new_matches_count: number;
  match_ids: string[];
  sent_at: string;
  opened_at?: string;
  created_at: string;
}

export interface SavedSearchSummary {
  total_searches: number;
  active_searches: number;
  total_matches: number;
  new_matches: number;
}

// Create a saved search
export async function createSavedSearch(
  userId: string,
  name: string,
  searchType: SearchType,
  criteria: SearchCriteria,
  notificationEnabled: boolean = true,
  notificationFrequency: NotificationFrequency = 'daily'
): Promise<{ success: boolean; search?: SavedSearch; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        name,
        search_type: searchType,
        search_criteria: criteria,
        notification_enabled: notificationEnabled,
        notification_frequency: notificationFrequency,
      })
      .select()
      .single();

    if (error) throw error;

    // Execute initial search to populate matches
    if (data) {
      await updateSearchMatches(data.id);
    }

    return { success: true, search: data };
  } catch (error: any) {
    console.error('Error creating saved search:', error);
    return { success: false, error: error.message };
  }
}

// Get user's saved searches
export async function getSavedSearches(
  userId: string,
  activeOnly: boolean = false
): Promise<SavedSearch[]> {
  try {
    let query = supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return [];
  }
}

// Get a single saved search
export async function getSavedSearch(searchId: string): Promise<SavedSearch | null> {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', searchId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching saved search:', error);
    return null;
  }
}

// Update a saved search
export async function updateSavedSearch(
  searchId: string,
  updates: Partial<SavedSearch>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_searches')
      .update(updates)
      .eq('id', searchId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating saved search:', error);
    return { success: false, error: error.message };
  }
}

// Delete a saved search
export async function deleteSavedSearch(
  searchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', searchId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting saved search:', error);
    return { success: false, error: error.message };
  }
}

// Toggle search active status
export async function toggleSearchActive(
  searchId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  return await updateSavedSearch(searchId, { is_active: isActive });
}

// Toggle notifications
export async function toggleSearchNotifications(
  searchId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  return await updateSavedSearch(searchId, { notification_enabled: enabled });
}

// Update notification frequency
export async function updateNotificationFrequency(
  searchId: string,
  frequency: NotificationFrequency
): Promise<{ success: boolean; error?: string }> {
  return await updateSavedSearch(searchId, { notification_frequency: frequency });
}

// Execute saved search and update matches
export async function updateSearchMatches(
  searchId: string
): Promise<{ success: boolean; newMatches?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('update_saved_search_matches', {
      p_search_id: searchId,
    });

    if (error) throw error;

    return { success: true, newMatches: data };
  } catch (error: any) {
    console.error('Error updating search matches:', error);
    return { success: false, error: error.message };
  }
}

// Get matches for a saved search
export async function getSearchMatches(
  searchId: string,
  newOnly: boolean = false
): Promise<SearchMatch[]> {
  try {
    let query = supabase
      .from('saved_search_matches')
      .select('*')
      .eq('saved_search_id', searchId)
      .order('created_at', { ascending: false });

    if (newOnly) {
      query = query.eq('is_new', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching search matches:', error);
    return [];
  }
}

// Get match details with full information
export async function getMatchDetails(matches: SearchMatch[]): Promise<any[]> {
  try {
    const details: any[] = [];

    // Group matches by type
    const providerIds = matches
      .filter((m) => m.match_type === 'provider')
      .map((m) => m.match_id);
    const jobIds = matches.filter((m) => m.match_type === 'job').map((m) => m.match_id);

    // Fetch provider details
    if (providerIds.length > 0) {
      const { data: providers } = await supabase
        .from('profiles')
        .select('*, category:categories(name)')
        .in('id', providerIds);

      if (providers) {
        providers.forEach((provider) => {
          const match = matches.find((m) => m.match_id === provider.id);
          details.push({
            ...provider,
            match_score: match?.match_score,
            match_type: 'provider',
            is_new: match?.is_new,
          });
        });
      }
    }

    // Fetch job details
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from('job_postings')
        .select('*, category:categories(name), customer:profiles!customer_id(full_name)')
        .in('id', jobIds);

      if (jobs) {
        jobs.forEach((job) => {
          const match = matches.find((m) => m.match_id === job.id);
          details.push({
            ...job,
            match_score: match?.match_score,
            match_type: 'job',
            is_new: match?.is_new,
          });
        });
      }
    }

    // Sort by match score
    details.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    return details;
  } catch (error) {
    console.error('Error fetching match details:', error);
    return [];
  }
}

// Mark matches as seen
export async function markMatchesSeen(
  searchId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('mark_search_matches_seen', {
      p_search_id: searchId,
    });

    if (error) throw error;

    return { success: true, count: data };
  } catch (error: any) {
    console.error('Error marking matches as seen:', error);
    return { success: false, error: error.message };
  }
}

// Get search notifications
export async function getSearchNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<SearchNotification[]> {
  try {
    let query = supabase
      .from('saved_search_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    if (unreadOnly) {
      query = query.is('opened_at', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching search notifications:', error);
    return [];
  }
}

// Mark notification as opened
export async function markNotificationOpened(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_search_notifications')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error marking notification as opened:', error);
    return { success: false, error: error.message };
  }
}

// Get saved search summary
export async function getSavedSearchSummary(
  userId: string
): Promise<SavedSearchSummary> {
  try {
    const { data, error } = await supabase.rpc('get_saved_search_summary', {
      p_user_id: userId,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        total_searches: Number(data[0].total_searches) || 0,
        active_searches: Number(data[0].active_searches) || 0,
        total_matches: Number(data[0].total_matches) || 0,
        new_matches: Number(data[0].new_matches) || 0,
      };
    }

    return {
      total_searches: 0,
      active_searches: 0,
      total_matches: 0,
      new_matches: 0,
    };
  } catch (error) {
    console.error('Error fetching search summary:', error);
    return {
      total_searches: 0,
      active_searches: 0,
      total_matches: 0,
      new_matches: 0,
    };
  }
}

// Format search criteria for display
export function formatSearchCriteria(criteria: SearchCriteria): string {
  const parts: string[] = [];

  if (criteria.category) {
    parts.push(criteria.category);
  }

  if (criteria.location) {
    parts.push(`in ${criteria.location}`);
  }

  if (criteria.min_rating) {
    parts.push(`${criteria.min_rating}+ stars`);
  }

  if (criteria.max_rate) {
    parts.push(`under $${criteria.max_rate}/hr`);
  }

  if (criteria.min_budget && criteria.max_budget) {
    parts.push(`$${criteria.min_budget}-$${criteria.max_budget}`);
  } else if (criteria.min_budget) {
    parts.push(`over $${criteria.min_budget}`);
  } else if (criteria.max_budget) {
    parts.push(`under $${criteria.max_budget}`);
  }

  if (criteria.keywords && criteria.keywords.length > 0) {
    parts.push(criteria.keywords.join(', '));
  }

  return parts.join(' • ') || 'All';
}

// Generate search name from criteria
export function generateSearchName(
  searchType: SearchType,
  criteria: SearchCriteria
): string {
  const parts: string[] = [];

  if (criteria.category) {
    parts.push(criteria.category);
  } else {
    parts.push(searchType);
  }

  if (criteria.location) {
    parts.push(`in ${criteria.location}`);
  }

  if (parts.length === 0) {
    return `My ${searchType} search`;
  }

  return parts.join(' ');
}

// Check if criteria matches current filters
export function criteriaMatchesFilters(
  criteria: SearchCriteria,
  currentFilters: SearchCriteria
): boolean {
  const keys = Object.keys(currentFilters);
  return keys.every((key) => {
    const criteriaValue = criteria[key];
    const filterValue = currentFilters[key];

    if (Array.isArray(filterValue)) {
      return (
        Array.isArray(criteriaValue) &&
        filterValue.every((v) => criteriaValue.includes(v))
      );
    }

    return criteriaValue === filterValue;
  });
}

// Get frequency label
export function getFrequencyLabel(frequency: NotificationFrequency): string {
  const labels: Record<NotificationFrequency, string> = {
    instant: 'Instant',
    daily: 'Daily',
    weekly: 'Weekly',
    never: 'Never',
  };
  return labels[frequency];
}

// Get frequency description
export function getFrequencyDescription(frequency: NotificationFrequency): string {
  const descriptions: Record<NotificationFrequency, string> = {
    instant: 'Get notified immediately when new matches are found',
    daily: 'Receive a daily summary of new matches',
    weekly: 'Receive a weekly summary of new matches',
    never: 'No notifications, check manually',
  };
  return descriptions[frequency];
}

// Estimate match potential
export function estimateMatchPotential(criteria: SearchCriteria): 'high' | 'medium' | 'low' {
  let score = 0;

  // More specific criteria = lower match potential
  if (criteria.category) score += 2;
  if (criteria.location) score += 2;
  if (criteria.min_rating && criteria.min_rating >= 4) score += 2;
  if (criteria.max_rate && criteria.max_rate <= 50) score += 2;
  if (criteria.keywords && criteria.keywords.length > 0) score += 1;

  if (score >= 6) return 'low';
  if (score >= 3) return 'medium';
  return 'high';
}
