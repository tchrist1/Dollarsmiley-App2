import { supabase } from './supabase';
import { FilterOptions } from '@/components/FilterModal';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  base_price: number;
  price_type: string;
  listing_type?: 'Service' | 'CustomService';
  provider_id: string;
  category_id: string;
  photos: string;
  rating_average?: number;
  review_count?: number;
  is_featured?: boolean;
  provider?: {
    full_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  category?: {
    name: string;
  };
  fulfillment_options?: Array<{
    fulfillment_type: string;
  }>;
  value_added_services?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

/**
 * Enhanced search with custom service filters
 */
export async function searchListings(
  searchQuery: string,
  filters: FilterOptions
): Promise<SearchResult[]> {
  try {
    let query = supabase
      .from('service_listings')
      .select(`
        *,
        provider:profiles!service_listings_provider_id_fkey(full_name, avatar_url, is_verified),
        category:categories!service_listings_category_id_fkey(name),
        fulfillment_options(fulfillment_type),
        value_added_services(id, name, price, is_active)
      `)
      .eq('is_active', true);

    // Text search
    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Category filter
    if (filters.categories.length > 0) {
      query = query.in('category_id', filters.categories);
    }

    // Price range
    if (filters.priceMin) {
      query = query.gte('base_price', parseFloat(filters.priceMin));
    }
    if (filters.priceMax) {
      query = query.lte('base_price', parseFloat(filters.priceMax));
    }

    // Listing type filter
    if (filters.listingType && filters.listingType !== 'all') {
      query = query.eq('listing_type', filters.listingType);
    }

    // Verified providers
    if (filters.verified) {
      const { data: verifiedProviders } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_verified', true);

      if (verifiedProviders) {
        const providerIds = verifiedProviders.map((p) => p.id);
        query = query.in('provider_id', providerIds);
      }
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    let results = data || [];

    // Post-query filtering for complex filters

    // Fulfillment type filter
    if (filters.fulfillmentTypes && filters.fulfillmentTypes.length > 0) {
      results = results.filter((listing) => {
        const listingFulfillmentTypes = listing.fulfillment_options?.map((fo: any) => fo.fulfillment_type) || [];
        return filters.fulfillmentTypes!.some((ft) => listingFulfillmentTypes.includes(ft));
      });
    }

    // Shipping mode filter
    if (filters.shippingMode && filters.shippingMode !== 'all') {
      results = results.filter((listing) => {
        return listing.shipping_mode === filters.shippingMode;
      });
    }

    // VAS filter
    if (filters.hasVAS) {
      results = results.filter((listing) => {
        const activeVAS = listing.value_added_services?.filter((vas: any) => vas.is_active) || [];
        return activeVAS.length > 0;
      });
    }

    // Minimum rating filter
    if (filters.minRating > 0) {
      results = results.filter((listing) => {
        return (listing.rating_average || 0) >= filters.minRating;
      });
    }

    // Sorting
    results = sortResults(results, filters.sortBy || 'relevance', searchQuery);

    return results as SearchResult[];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Sort search results
 */
function sortResults(
  results: any[],
  sortBy: string,
  searchQuery: string
): any[] {
  switch (sortBy) {
    case 'price_low':
      return results.sort((a, b) => a.base_price - b.base_price);

    case 'price_high':
      return results.sort((a, b) => b.base_price - a.base_price);

    case 'rating':
      return results.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));

    case 'popular':
      return results.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));

    case 'recent':
      return results.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    case 'relevance':
    default:
      // Boost featured listings and exact matches
      return results.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;

        const aExact = a.title.toLowerCase().includes(searchQuery.toLowerCase());
        const bExact = b.title.toLowerCase().includes(searchQuery.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        return (b.rating_average || 0) - (a.rating_average || 0);
      });
  }
}

/**
 * Get active filter count
 */
export function getActiveFilterCount(filters: FilterOptions): number {
  let count = 0;

  if (filters.categories.length > 0) count++;
  if (filters.priceMin || filters.priceMax) count++;
  if (filters.minRating > 0) count++;
  if (filters.verified) count++;
  if (filters.instant_booking) count++;
  if (filters.listingType && filters.listingType !== 'all') count++;
  if (filters.fulfillmentTypes && filters.fulfillmentTypes.length > 0) count++;
  if (filters.shippingMode && filters.shippingMode !== 'all') count++;
  if (filters.hasVAS) count++;

  return count;
}

/**
 * Get filter summary text
 */
export function getFilterSummary(filters: FilterOptions): string[] {
  const summary: string[] = [];

  if (filters.categories.length > 0) {
    summary.push(`${filters.categories.length} categories`);
  }

  if (filters.priceMin || filters.priceMax) {
    const min = filters.priceMin || '0';
    const max = filters.priceMax || '∞';
    summary.push(`$${min}-$${max}`);
  }

  if (filters.minRating > 0) {
    summary.push(`${filters.minRating}+ stars`);
  }

  if (filters.listingType && filters.listingType !== 'all') {
    summary.push(filters.listingType === 'CustomService' ? 'Custom Services' : 'Standard Services');
  }

  if (filters.fulfillmentTypes && filters.fulfillmentTypes.length > 0) {
    summary.push(filters.fulfillmentTypes.join(', '));
  }

  if (filters.hasVAS) {
    summary.push('With Add-ons');
  }

  return summary;
}
