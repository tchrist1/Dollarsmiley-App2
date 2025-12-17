import { supabase } from './supabase';

export type FilterInputType = 'range' | 'select' | 'multiselect' | 'boolean' | 'date' | 'daterange' | 'text';
export type SearchType = 'jobs' | 'providers' | 'listings' | 'posts';
export type FilterType = 'price' | 'rating' | 'distance' | 'availability' | 'features' | 'verification' | 'experience' | 'language' | 'payment' | 'certification';

export interface FilterTemplate {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  filter_config: Record<string, any>;
  is_public: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  search_type: SearchType;
  filter_config: Record<string, any>;
  is_default: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface FilterOption {
  id: string;
  category_id: string | null;
  filter_type: FilterType;
  option_key: string;
  option_label: string;
  option_values: any[];
  input_type: FilterInputType;
  sort_order: number;
  is_active: boolean;
}

export interface FilterCombination {
  id: string;
  search_type: string;
  filter_hash: string;
  filter_config: Record<string, any>;
  usage_count: number;
  results_avg: number;
  last_used_at: string;
  created_at: string;
}

export interface FilterPreset {
  id: string;
  preset_name: string;
  preset_label: string;
  search_type: string;
  filter_config: Record<string, any>;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CustomFilterField {
  id: string;
  category_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'enum';
  field_options: any[];
  is_required: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  created_at: string;
}

export interface FilterSuggestion {
  filter_type: string;
  value: any;
  reason: string;
}

/**
 * Get filter templates
 */
export async function getFilterTemplates(categoryId?: string): Promise<FilterTemplate[]> {
  try {
    let query = supabase
      .from('search_filter_templates')
      .select('*')
      .eq('is_public', true)
      .order('usage_count', { ascending: false });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching filter templates:', error);
    return [];
  }
}

/**
 * Get user saved filters
 */
export async function getSavedFilters(
  userId: string,
  searchType?: SearchType
): Promise<SavedFilter[]> {
  try {
    let query = supabase
      .from('user_saved_filters')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false, nullsFirst: false });

    if (searchType) {
      query = query.eq('search_type', searchType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching saved filters:', error);
    return [];
  }
}

/**
 * Save filter
 */
export async function saveFilter(
  userId: string,
  name: string,
  searchType: SearchType,
  filterConfig: Record<string, any>,
  isDefault: boolean = false
): Promise<string | null> {
  try {
    if (isDefault) {
      await supabase
        .from('user_saved_filters')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('search_type', searchType);
    }

    const { data, error } = await supabase
      .from('user_saved_filters')
      .insert({
        user_id: userId,
        name,
        search_type: searchType,
        filter_config: filterConfig,
        is_default: isDefault,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving filter:', error);
    return null;
  }
}

/**
 * Update saved filter
 */
export async function updateSavedFilter(
  filterId: string,
  updates: Partial<SavedFilter>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_saved_filters')
      .update(updates)
      .eq('id', filterId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating saved filter:', error);
    return false;
  }
}

/**
 * Delete saved filter
 */
export async function deleteSavedFilter(filterId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_saved_filters')
      .delete()
      .eq('id', filterId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting saved filter:', error);
    return false;
  }
}

/**
 * Get default filter for user
 */
export async function getDefaultFilter(
  userId: string,
  searchType: SearchType
): Promise<SavedFilter | null> {
  try {
    const { data, error } = await supabase
      .from('user_saved_filters')
      .select('*')
      .eq('user_id', userId)
      .eq('search_type', searchType)
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching default filter:', error);
    return null;
  }
}

/**
 * Get filter options for category
 */
export async function getFilterOptions(categoryId?: string): Promise<FilterOption[]> {
  try {
    let query = supabase
      .from('filter_options')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (categoryId) {
      query = query.or(`category_id.eq.${categoryId},category_id.is.null`);
    } else {
      query = query.is('category_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return [];
  }
}

/**
 * Get filter presets
 */
export async function getFilterPresets(searchType?: string): Promise<FilterPreset[]> {
  try {
    let query = supabase
      .from('filter_presets')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (searchType) {
      query = query.eq('search_type', searchType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching filter presets:', error);
    return [];
  }
}

/**
 * Record filter usage
 */
export async function recordFilterUsage(
  searchType: string,
  filterConfig: Record<string, any>,
  resultsCount: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('record_filter_usage', {
      search_type_param: searchType,
      filter_config_param: filterConfig,
      results_count_param: resultsCount,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording filter usage:', error);
    return null;
  }
}

/**
 * Get popular filter combinations
 */
export async function getPopularFilterCombinations(
  searchType: string,
  limit: number = 10
): Promise<FilterCombination[]> {
  try {
    const { data, error } = await supabase.rpc('get_popular_filter_combinations', {
      search_type_param: searchType,
      limit_param: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular combinations:', error);
    return [];
  }
}

/**
 * Get filter suggestions for search query
 */
export async function getFilterSuggestions(
  searchQuery: string,
  searchType: string
): Promise<FilterSuggestion[]> {
  try {
    const { data, error } = await supabase.rpc('suggest_filters_for_query', {
      search_query_param: searchQuery,
      search_type_param: searchType,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting filter suggestions:', error);
    return [];
  }
}

/**
 * Get custom filter fields for category
 */
export async function getCustomFilterFields(categoryId: string): Promise<CustomFilterField[]> {
  try {
    const { data, error } = await supabase
      .from('custom_filter_fields')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_filterable', true)
      .order('field_label', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching custom filter fields:', error);
    return [];
  }
}

/**
 * Build filter query
 */
export function buildFilterQuery(filters: Record<string, any>): string {
  const conditions: string[] = [];

  if (filters.price) {
    if (filters.price.min !== undefined) {
      conditions.push(`price >= ${filters.price.min}`);
    }
    if (filters.price.max !== undefined) {
      conditions.push(`price <= ${filters.price.max}`);
    }
  }

  if (filters.rating) {
    if (filters.rating.min !== undefined) {
      conditions.push(`rating_average >= ${filters.rating.min}`);
    }
  }

  if (filters.distance) {
    if (filters.distance.max !== undefined) {
      conditions.push(`distance <= ${filters.distance.max}`);
    }
  }

  if (filters.verification?.verified === true) {
    conditions.push(`verification_status = 'verified'`);
  }

  if (filters.availability?.date) {
    conditions.push(`available_date >= '${filters.availability.date}'`);
  }

  if (filters.languages && Array.isArray(filters.languages)) {
    const langConditions = filters.languages.map((lang) => `'${lang}' = ANY(languages)`);
    conditions.push(`(${langConditions.join(' OR ')})`);
  }

  if (filters.payment_methods && Array.isArray(filters.payment_methods)) {
    const paymentConditions = filters.payment_methods.map(
      (method) => `'${method}' = ANY(payment_methods)`
    );
    conditions.push(`(${paymentConditions.join(' OR ')})`);
  }

  return conditions.join(' AND ');
}

/**
 * Apply filters to Supabase query
 */
export function applyFilters(query: any, filters: Record<string, any>): any {
  let modifiedQuery = query;

  if (filters.price) {
    if (filters.price.min !== undefined) {
      modifiedQuery = modifiedQuery.gte('estimated_budget', filters.price.min);
    }
    if (filters.price.max !== undefined) {
      modifiedQuery = modifiedQuery.lte('estimated_budget', filters.price.max);
    }
  }

  if (filters.rating?.min) {
    modifiedQuery = modifiedQuery.gte('rating_average', filters.rating.min);
  }

  if (filters.distance?.max) {
    modifiedQuery = modifiedQuery.lte('distance', filters.distance.max);
  }

  if (filters.verification?.verified === true) {
    modifiedQuery = modifiedQuery.eq('verification_status', 'verified');
  }

  if (filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
    modifiedQuery = modifiedQuery.in('category_id', filters.categories);
  }

  if (filters.date_posted) {
    const now = new Date();
    let cutoffDate: Date;

    switch (filters.date_posted) {
      case 'last_24_hours':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }

    modifiedQuery = modifiedQuery.gte('created_at', cutoffDate.toISOString());
  }

  if (filters.urgency === 'high') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    modifiedQuery = modifiedQuery.lte('execution_date_start', tomorrow.toISOString());
  }

  return modifiedQuery;
}

/**
 * Merge filter configurations
 */
export function mergeFilters(
  baseFilters: Record<string, any>,
  newFilters: Record<string, any>
): Record<string, any> {
  const merged = { ...baseFilters };

  Object.keys(newFilters).forEach((key) => {
    if (Array.isArray(newFilters[key]) && Array.isArray(merged[key])) {
      merged[key] = [...new Set([...merged[key], ...newFilters[key]])];
    } else if (
      typeof newFilters[key] === 'object' &&
      newFilters[key] !== null &&
      !Array.isArray(newFilters[key])
    ) {
      merged[key] = { ...merged[key], ...newFilters[key] };
    } else {
      merged[key] = newFilters[key];
    }
  });

  return merged;
}

/**
 * Validate filter configuration
 */
export function validateFilters(filters: Record<string, any>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (filters.price) {
    if (
      filters.price.min !== undefined &&
      filters.price.max !== undefined &&
      filters.price.min > filters.price.max
    ) {
      errors.push('Minimum price cannot be greater than maximum price');
    }
  }

  if (filters.distance?.max !== undefined && filters.distance.max < 0) {
    errors.push('Distance must be positive');
  }

  if (filters.rating?.min !== undefined) {
    if (filters.rating.min < 0 || filters.rating.min > 5) {
      errors.push('Rating must be between 0 and 5');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get active filter count
 */
export function getActiveFilterCount(filters: Record<string, any>): number {
  let count = 0;

  Object.keys(filters).forEach((key) => {
    const value = filters[key];

    if (Array.isArray(value) && value.length > 0) {
      count++;
    } else if (typeof value === 'object' && value !== null) {
      if (Object.keys(value).length > 0) {
        count++;
      }
    } else if (value !== undefined && value !== null && value !== '') {
      count++;
    }
  });

  return count;
}

/**
 * Clear all filters
 */
export function clearAllFilters(): Record<string, any> {
  return {};
}

/**
 * Remove specific filter
 */
export function removeFilter(
  filters: Record<string, any>,
  filterKey: string
): Record<string, any> {
  const updated = { ...filters };
  delete updated[filterKey];
  return updated;
}

/**
 * Get filter display label
 */
export function getFilterDisplayLabel(filterKey: string, value: any): string {
  switch (filterKey) {
    case 'price':
      if (value.min && value.max) {
        return `$${value.min} - $${value.max}`;
      } else if (value.min) {
        return `$${value.min}+`;
      } else if (value.max) {
        return `Up to $${value.max}`;
      }
      return 'Price';

    case 'rating':
      return `${value.min}+ stars`;

    case 'distance':
      return `Within ${value.max} km`;

    case 'verification':
      return 'Verified only';

    case 'categories':
      return `${value.length} ${value.length === 1 ? 'category' : 'categories'}`;

    case 'date_posted':
      return value.replace(/_/g, ' ');

    case 'urgency':
      return 'Urgent';

    default:
      return filterKey;
  }
}

/**
 * Export filters to JSON
 */
export function exportFilters(filters: Record<string, any>): string {
  return JSON.stringify(filters, null, 2);
}

/**
 * Import filters from JSON
 */
export function importFilters(json: string): Record<string, any> | null {
  try {
    const filters = JSON.parse(json);
    const validation = validateFilters(filters);

    if (!validation.valid) {
      console.error('Invalid filters:', validation.errors);
      return null;
    }

    return filters;
  } catch (error) {
    console.error('Error importing filters:', error);
    return null;
  }
}

/**
 * Get filter preset by name
 */
export async function getFilterPresetByName(presetName: string): Promise<FilterPreset | null> {
  try {
    const { data, error } = await supabase
      .from('filter_presets')
      .select('*')
      .eq('preset_name', presetName)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching filter preset:', error);
    return null;
  }
}

/**
 * Increment saved filter usage
 */
export async function incrementFilterUsage(filterId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('increment', {
      table_name: 'user_saved_filters',
      row_id: filterId,
      column_name: 'usage_count',
    });

    await supabase
      .from('user_saved_filters')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', filterId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error incrementing filter usage:', error);
    return false;
  }
}
