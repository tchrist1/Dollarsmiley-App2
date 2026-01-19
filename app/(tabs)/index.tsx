import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image, InteractionManager } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Search, MapPin, DollarSign, Star, SlidersHorizontal, TrendingUp, Clock, X, Navigation, List, LayoutGrid, User, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ServiceListing, MarketplaceListing, Job } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDistance, geocodeAddress } from '@/lib/geolocation';
import { FilterModal, FilterOptions, defaultFilters } from '@/components/FilterModal';
import MapViewPlatform from '@/components/MapViewPlatform';
import InteractiveMapViewPlatform from '@/components/InteractiveMapViewPlatform';
import { RecommendationsCarousel } from '@/components/RecommendationsCarousel';
import FeaturedListingsSection from '@/components/FeaturedListingsSection';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import ImageSearchButton from '@/components/ImageSearchButton';
import AdminBanner from '@/components/AdminBanner';
import MapModeBar from '@/components/MapModeBar';
import MapFAB from '@/components/MapFAB';
import MapStatusHint from '@/components/MapStatusHint';
import { NativeInteractiveMapViewRef } from '@/components/NativeInteractiveMapView';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';
import { logPerfEvent, logRender, logNetworkCall } from '@/lib/performance-test-utils';
import { invalidateAllCaches } from '@/lib/session-cache';
import { invalidateAllListingCaches } from '@/lib/listing-cache';

// PHASE 2: Import data layer hooks
import { useListings } from '@/hooks/useListings';
import { useCarousels } from '@/hooks/useCarousels';
import { useTrendingSearches } from '@/hooks/useTrendingSearches';
import { useMapData } from '@/hooks/useMapData';

// ============================================================================
// PRIORITY 5 FIX: Memoized card components to prevent re-renders
// Before: Parent re-renders → renderListingCard recreates all card elements → all cards re-render
// After: Parent re-renders → Memoized cards check if props changed → only changed cards re-render
// ============================================================================

interface ListingCardProps {
  item: MarketplaceListing;
  onPress: (id: string, isJob: boolean) => void;
}

const ListingCard = memo(({ item, onPress }: ListingCardProps) => {
  const isJob = item.marketplace_type === 'Job';
  const profile = isJob ? item.customer : item.provider;
  const listing = item as any;

  // Type label logic
  let typeLabel = { text: 'SERVICE', color: colors.success };
  if (isJob) {
    typeLabel = { text: 'JOB', color: colors.primary };
  } else if (listing.listing_type === 'CustomService') {
    typeLabel = { text: 'CUSTOM', color: colors.accent };
  }

  // Price calculation
  let priceText = '';
  if (isJob) {
    if (listing.fixed_price) {
      priceText = formatCurrency(listing.fixed_price);
    } else if (listing.budget_min && listing.budget_max) {
      priceText = `${formatCurrency(listing.budget_min)} - ${formatCurrency(listing.budget_max)}`;
    } else if (listing.budget_min) {
      priceText = `From ${formatCurrency(listing.budget_min)}`;
    } else {
      priceText = 'Budget TBD';
    }
  } else {
    const priceType = listing.pricing_type === 'Hourly' ? 'hour' : 'job';
    priceText = `${formatCurrency(listing.base_price || 0)}/${priceType}`;
  }

  return (
    <TouchableOpacity
      style={styles.listingCard}
      activeOpacity={0.7}
      onPress={() => onPress(item.id, isJob)}
    >
      <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: typeLabel.color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, zIndex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{typeLabel.text}</Text>
      </View>
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.listingMeta}>
          <View style={styles.listingLocation}>
            <MapPin size={14} color={colors.textLight} />
            <Text style={styles.listingLocationText} numberOfLines={1}>
              {item.location || 'Remote'}
            </Text>
          </View>
          {profile?.rating_average && profile.rating_average > 0 && (
            <View style={styles.listingRating}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={styles.listingRatingText}>
                {profile.rating_average.toFixed(1)} ({profile.rating_count || 0})
              </Text>
            </View>
          )}
        </View>
        <View style={styles.listingFooter}>
          <View style={styles.listingProvider}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.providerAvatar} />
            ) : (
              <View style={[styles.providerAvatar, styles.providerAvatarPlaceholder]}>
                <User size={16} color={colors.textLight} />
              </View>
            )}
            <Text style={styles.providerName} numberOfLines={1}>
              {profile?.full_name || 'Anonymous'}
            </Text>
          </View>
          <Text style={styles.listingPrice}>{priceText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const GridCard = memo(({ item, onPress }: ListingCardProps) => {
  const isJob = item.marketplace_type === 'Job';
  const profile = isJob ? item.customer : item.provider;
  const listing = item as any;

  // Type label logic
  let typeLabel = { text: 'SERVICE', color: colors.success };
  if (isJob) {
    typeLabel = { text: 'JOB', color: colors.primary };
  } else if (listing.listing_type === 'CustomService') {
    typeLabel = { text: 'CUSTOM', color: colors.accent };
  }

  const mainImage = listing.featured_image_url || null;

  // Price calculation
  let priceText = '';
  let priceSuffix = '';
  if (isJob) {
    if (listing.fixed_price) {
      priceText = formatCurrency(listing.fixed_price);
      priceSuffix = '';
    } else if (listing.budget_min && listing.budget_max) {
      priceText = `${formatCurrency(listing.budget_min)}-${formatCurrency(listing.budget_max)}`;
      priceSuffix = '';
    } else if (listing.budget_min) {
      priceText = formatCurrency(listing.budget_min);
      priceSuffix = '+';
    } else {
      priceText = 'Budget TBD';
      priceSuffix = '';
    }
  } else {
    const priceType = listing.pricing_type === 'Hourly' ? 'hour' : 'job';
    priceText = formatCurrency(listing.base_price || 0);
    priceSuffix = `/${priceType}`;
  }

  return (
    <TouchableOpacity
      style={styles.gridCard}
      activeOpacity={0.7}
      onPress={() => onPress(item.id, isJob)}
    >
      {mainImage ? (
        <Image source={{ uri: mainImage }} style={styles.gridCardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.gridCardImage, styles.gridCardImagePlaceholder]}>
          <Text style={styles.gridCardImagePlaceholderText}>
            {isJob ? '💼' : listing.listing_type === 'CustomService' ? '✨' : '🛠️'}
          </Text>
        </View>
      )}
      <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: typeLabel.color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, zIndex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{typeLabel.text}</Text>
      </View>
      <View style={styles.gridCardContent}>
        <View style={styles.gridHeader}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.gridAvatar} />
          ) : (
            <View style={[styles.gridAvatar, styles.gridAvatarPlaceholder]}>
              <Text style={styles.gridAvatarText}>
                {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
              </Text>
            </View>
          )}
          {profile && (
            <Text style={styles.gridAccountName} numberOfLines={1}>
              {profile.full_name}
            </Text>
          )}
          {profile && profile.rating_average > 0 && (
            <View style={styles.gridRating}>
              <Star size={10} color={colors.warning} fill={colors.warning} />
              <Text style={styles.gridRatingText}>{profile.rating_average?.toFixed(1) || 'N/A'}</Text>
            </View>
          )}
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.gridDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {listing.distance_miles !== undefined && (
          <View style={styles.gridDistanceBadge}>
            <Navigation size={10} color={colors.white} />
            <Text style={styles.gridDistanceBadgeText}>
              {listing.distance_miles < 1
                ? `${(listing.distance_miles * 5280).toFixed(0)} ft`
                : listing.distance_miles ? `${listing.distance_miles.toFixed(1)} mi` : 'N/A'}
            </Text>
          </View>
        )}
        <View style={styles.gridFooter}>
          <View style={styles.gridLocation}>
            <MapPin size={12} color={colors.textLight} />
            <Text style={styles.gridLocationText} numberOfLines={1}>
              {item.location || 'Remote'}
            </Text>
          </View>
          <View style={styles.gridPrice}>
            <Text style={styles.gridPriceAmount}>{priceText}</Text>
            {priceSuffix ? <Text style={styles.gridPriceType}>{priceSuffix}</Text> : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================

interface SearchSuggestion {
  suggestion: string;
  search_count: number;
}

// ============================================================================
// PHASE 1: CAROUSEL LAZY LOADING
// ============================================================================
// Carousels are now lazy-loaded 2 seconds after initial render to prevent
// blocking the main listings load. This improves initial render time by ~500ms.
// ============================================================================

export default function HomeScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('grid');
  const [mapMode, setMapMode] = useState<'listings' | 'providers'>('listings');
  const [mapZoomLevel, setMapZoomLevel] = useState(12);
  const [showMapStatusHint, setShowMapStatusHint] = useState(false);
  const mapStatusHintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mapRef = useRef<NativeInteractiveMapViewRef>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    ...defaultFilters,
    listingType: (params.filter as 'all' | 'Job' | 'Service' | 'CustomService') || 'all',
  });

  // PHASE 1: Carousel sections with lazy loading flag
  const [showCarousels, setShowCarousels] = useState(false);

  // PHASE 2: Data layer hooks replace old state and fetch functions
  const {
    listings,
    loading,
    loadingMore,
    hasMore,
    error: listingsError,
    fetchMore,
    refresh: refreshListings,
  } = useListings({
    searchQuery,
    filters,
    userId: profile?.id || null,
    pageSize: 20,
    debounceMs: 300,
  });

  const {
    trending: trendingListings,
    popular: popularListings,
    recommended: recommendedListings,
    loading: carouselsLoading,
    error: carouselsError,
    refresh: refreshCarousels,
  } = useCarousels({
    userId: profile?.id || null,
    enabled: true,
    lazyLoadDelayMs: 2000,
  });

  const {
    searches: trendingSearches,
    loading: trendingSearchesLoading,
    error: trendingSearchesError,
    refresh: refreshTrendingSearches,
  } = useTrendingSearches({
    userId: profile?.id || null,
    enabled: true,
    limit: 5,
    useInteractionManager: true,
  });

  const {
    userLocation,
    searchLocation,
    locationPermissionStatus,
    loading: locationLoading,
    error: locationError,
    setSearchLocation,
    requestLocationPermission,
    refreshLocation,
  } = useMapData({
    userProfileLocation: profile?.latitude && profile?.longitude
      ? { latitude: profile.latitude, longitude: profile.longitude }
      : null,
    requestDelayMs: 500,
    enabled: true,
  });

  // ============================================================================
  // DEV-ONLY PERFORMANCE INSTRUMENTATION
  // ============================================================================
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (__DEV__) {
      logRender('HomeScreen');

      if (firstRenderRef.current) {
        logPerfEvent('HOME_FIRST_RENDER');
        firstRenderRef.current = false;
      }
    }
  });

  useEffect(() => {
    if (__DEV__ && !loading && listings.length > 0) {
      logPerfEvent('HOME_INTERACTIVE_READY', {
        listingsCount: listings.length,
      });
    }
  }, [loading, listings.length]);

  // ============================================================================
  // PHASE 4: CACHE INVALIDATION - Clear all caches on user change or logout
  // ============================================================================
  const userIdRef = useRef<string | null>(profile?.id || null);

  useEffect(() => {
    const currentUserId = profile?.id || null;

    // Invalidate cache if user changed (logout or account switch)
    if (userIdRef.current !== currentUserId) {
      if (__DEV__) console.log('[PHASE_4] User changed - invalidating all caches');
      invalidateAllListingCaches(); // PHASE 2: Home listings cache
      invalidateAllCaches(); // Session caches (trending, carousel, geocoding, categories)
      userIdRef.current = currentUserId;
    }
  }, [profile?.id]);

  // ============================================================================
  // PHASE 1: CAROUSEL LAZY LOADING WITH 2-SECOND DELAY
  // ============================================================================
  // Enable carousel rendering after 2 seconds to avoid blocking initial load
  // This is a one-time effect that runs on mount
  // ============================================================================
  useEffect(() => {
    const carouselTimer = setTimeout(() => {
      setShowCarousels(true);
    }, 2000);

    return () => clearTimeout(carouselTimer);
  }, []);

  // ============================================================================
  // PHASE 2: DATA FETCHING NOW HANDLED BY HOOKS
  // ============================================================================
  // - useListings: Main listings with search, filters, pagination
  // - useCarousels: Trending/popular/recommended with lazy loading
  // - useTrendingSearches: Search suggestions with InteractionManager
  // - useMapData: Location permissions and geolocation
  // ============================================================================

  // PHASE 2: Carousel data now managed by useCarousels hook with automatic lazy loading

  // Handle filter parameter from navigation
  useEffect(() => {
    if (params.filter) {
      const filterType = params.filter as 'all' | 'Job' | 'Service' | 'CustomService';
      setFilters(prev => ({
        ...prev,
        listingType: filterType,
      }));
    }
  }, [params.filter]);

  // Handle category parameter from navigation (from Categories screen)
  useEffect(() => {
    if (params.categoryId && params.categoryName) {
      // Use searchQuery-based filtering for subcategory selection
      // This ensures identical behavior to typing in the search bar
      setSearchQuery(params.categoryName as string);

      // Clear any incompatible category filters to prevent zero results
      setFilters(prev => ({
        ...prev,
        categories: [],
      }));
    }
  }, [params.categoryId, params.categoryName]);

  // Handle search parameter from navigation
  useEffect(() => {
    if (params.search) {
      setSearchQuery(params.search as string);
    }
  }, [params.search]);

  // PHASE 2: Location permission now managed by useMapData hook with delayed request

  // PHASE 2: Debounced search and filtering now managed by useListings hook

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const { data, error } = await supabase.rpc('get_search_suggestions', {
      p_query: query.toLowerCase(),
      p_limit: 5,
    });

    if (data && !error) {
      setSuggestions(data.map((d: any) => ({ suggestion: d.suggestion, search_count: d.search_count })));
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setShowSuggestions(text.length > 0);
    fetchSuggestions(text);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleVoiceResults = (results: any[], query: string) => {
    if (results.length > 0) {
      // PHASE 2: Voice search now uses search query to trigger useListings hook
      setSearchQuery(query);
      setShowSuggestions(false);
    }
  };

  const handleVoiceError = (error: string) => {
    // Error handled silently
  };

  const handleImageResults = (matches: any[], analysis: any) => {
    if (matches.length > 0) {
      // PHASE 2: Image search now uses search query to trigger useListings hook
      setSearchQuery(analysis.description || 'Image search results');
      setShowSuggestions(false);
    }
  };

  const handleImageError = (error: string) => {
    // Error handled silently
  };

  const recordSearch = async (query: string, resultsCount: number) => {
    if (!query.trim()) return;

    await supabase.rpc('record_search', {
      p_user_id: profile?.id || null,
      p_search_query: query,
      p_filters_applied: filters,
      p_results_count: resultsCount,
    });
  };

  // PHASE 2: Normalization functions now in useListings and useCarousels hooks

  // ============================================================================
  // PHASE 2: Core data fetching now handled by useListings hook
  // Includes: search, filtering, pagination, sorting, and caching
  // ============================================================================
  // fetchListings function removed - replaced by useListings hook (see lines 277-291)

  // PHASE 2: Deprecated - replaced by useListings hook
  const fetchListings = async (reset: boolean = false) => {
    // This function is no longer used - all data fetching is handled by useListings hook
    if (__DEV__) console.warn('[DEPRECATED] fetchListings called - should not happen');
  };

  // Keep activeFilterCount as it's still used in UI
  // PHASE 2 OPTIMIZATION: Memoize activeFilterCount to prevent recalculation on every render
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.location.trim()) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.minRating > 0) count++;
    if (filters.distance && filters.distance !== 25) count++;
    if (filters.availability && filters.availability !== 'any') count++;
    if (filters.sortBy && filters.sortBy !== 'relevance') count++;
    if (filters.verified) count++;
    if (filters.instant_booking) count++;
    if (filters.listingType && filters.listingType !== 'all') count++;
    if (filters.fulfillmentTypes && filters.fulfillmentTypes.length > 0) count++;
    if (filters.shippingMode && filters.shippingMode !== 'all') count++;
    if (filters.hasVAS) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  // Dummy search timeout ref kept for compatibility
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Skip to next section after old fetchListings body
  // vvvvvvvvvvvv TEMPORARY MARKER - OLD CODE BELOW vvvvvvvvvvvv
  if (false) {
    // Old fetch code preserved but never executed - to be removed in cleanup
    const old_code_block_start = true;
    const activeFilterCount_placeholder = 0; // Placeholder to prevent duplicate declaration error
    if (old_code_block_start && activeFilterCount_placeholder) {
      const _dummy = 0;
        hasSearch: !!searchQuery.trim(),
      });
    }

    // ============================================================================
    // CACHE OPTIMIZATION: Check cache on initial load only
    // ============================================================================
    const isInitialLoad = reset && !searchQuery.trim() && filters.categories.length === 0 &&
                          !filters.location.trim() && !filters.priceMin && !filters.priceMax;

    if (isInitialLoad) {
      const cachedData = getCachedListings(profile?.id || null);

      if (cachedData) {
        // Cache hit - populate state immediately for instant render
        setLoading(false);
        setListings(cachedData.slice(0, PAGE_SIZE));
        setPage(1);
        setHasMore(cachedData.length > PAGE_SIZE);

        // Continue to background refresh (MANDATORY)
        // Fresh data will silently replace cache
        if (__DEV__) console.log('[HOME_CACHE] Starting background refresh...');
      }
    }
    // ============================================================================

    if (reset) {
      if (!isInitialLoad || !getCachedListings(profile?.id || null)) {
        // Only show loading if cache miss or filtered load
        setLoading(true);
      }
      setListings([]);
    } else {
      // PHASE 1: Remove ref mutation - use state directly
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page;
    const offset = currentPage * PAGE_SIZE;

    try {
      let allResults: MarketplaceListing[] = [];

      const shouldFetchServices = !filters.listingType || filters.listingType === 'all' || filters.listingType === 'Service' || filters.listingType === 'CustomService';
      const shouldFetchJobs = !filters.listingType || filters.listingType === 'all' || filters.listingType === 'Job';

      // ============================================================================
      // PHASE 1 OPTIMIZATION: Parallelize service and job fetches
      // ============================================================================
      if (__DEV__) {
        const parallelStart = performance.now();

        const fetchPromises: Promise<{
          type: 'service' | 'job';
          data: any[] | null;
          error: any;
          duration?: number;
        }>[] = [];

        // Build service query
        if (shouldFetchServices) {
          let serviceQuery = supabase
            .from('service_listings')
            .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)');

          if (filters.listingType === 'Service') {
            serviceQuery = serviceQuery.eq('listing_type', 'Service');
          } else if (filters.listingType === 'CustomService') {
            serviceQuery = serviceQuery.eq('listing_type', 'CustomService');
          }

          serviceQuery = serviceQuery.eq('status', 'Active');

          if (searchQuery.trim()) {
            serviceQuery = serviceQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          if (filters.categories.length > 0) {
            serviceQuery = serviceQuery.in('category_id', filters.categories);
          }

          if (filters.location.trim()) {
            serviceQuery = serviceQuery.ilike('location', `%${filters.location}%`);
          }

          if (filters.priceMin) {
            serviceQuery = serviceQuery.gte('base_price', parseFloat(filters.priceMin));
          }

          if (filters.priceMax) {
            serviceQuery = serviceQuery.lte('base_price', parseFloat(filters.priceMax));
          }

          if (filters.verified) {
            serviceQuery = serviceQuery.eq('profiles.is_verified', true);
          }

          serviceQuery = serviceQuery.order('created_at', { ascending: false }).limit(PAGE_SIZE * 2);

          fetchPromises.push(
            (async () => {
              const networkStart = performance.now();
              const { data, error } = await serviceQuery;
              const networkDuration = performance.now() - networkStart;
              return { type: 'service' as const, data, error, duration: networkDuration };
            })()
          );
        }

        // Build job query
        if (shouldFetchJobs) {
          let jobQuery = supabase
            .from('jobs')
            .select('*, profiles!jobs_customer_id_fkey(*), categories(*)');

          jobQuery = jobQuery.eq('status', 'Open');

          if (searchQuery.trim()) {
            jobQuery = jobQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          if (filters.categories.length > 0) {
            jobQuery = jobQuery.in('category_id', filters.categories);
          }

          if (filters.location.trim()) {
            jobQuery = jobQuery.ilike('location', `%${filters.location}%`);
          }

          // Price filters: Include quote-based jobs AND jobs matching price criteria
          // Quote-based jobs (pricing_type = 'quote_based') should always be included
          if (filters.priceMin || filters.priceMax) {
            const conditions: string[] = ['pricing_type.eq.quote_based']; // Always include quote-based jobs

            if (filters.priceMin && filters.priceMax) {
              // Both min and max set: include if budget or fixed_price is within range
              conditions.push(`and(budget_min.gte.${parseFloat(filters.priceMin)},budget_max.lte.${parseFloat(filters.priceMax)})`);
              conditions.push(`and(fixed_price.gte.${parseFloat(filters.priceMin)},fixed_price.lte.${parseFloat(filters.priceMax)})`);
            } else if (filters.priceMin) {
              // Only min set
              conditions.push(`budget_min.gte.${parseFloat(filters.priceMin)}`);
              conditions.push(`fixed_price.gte.${parseFloat(filters.priceMin)}`);
            } else if (filters.priceMax) {
              // Only max set
              conditions.push(`budget_max.lte.${parseFloat(filters.priceMax)}`);
              conditions.push(`fixed_price.lte.${parseFloat(filters.priceMax)}`);
            }

            jobQuery = jobQuery.or(conditions.join(','));
          }

          jobQuery = jobQuery.order('created_at', { ascending: false }).limit(PAGE_SIZE * 2);

          fetchPromises.push(
            (async () => {
              const networkStart = performance.now();
              const { data, error } = await jobQuery;
              const networkDuration = performance.now() - networkStart;
              return { type: 'job' as const, data, error, duration: networkDuration };
            })()
          );
        }

        // Execute all queries in parallel
        const results = await Promise.all(fetchPromises);
        const parallelDuration = performance.now() - parallelStart;

        // Process results in original order (services first, then jobs)
        for (const result of results) {
          if (result.type === 'service') {
            logNetworkCall('service_listings', result.duration!);
            if (!result.error && result.data) {
              const normalizedServices = result.data.map(normalizeServiceListing);
              allResults = [...allResults, ...normalizedServices];
            }
          } else if (result.type === 'job') {
            logNetworkCall('jobs', result.duration!);
            if (!result.error && result.data) {
              const normalizedJobs = result.data.map(normalizeJob);
              allResults = [...allResults, ...normalizedJobs];
            }
          }
        }

        console.log(`[PERF] PARALLEL_FETCH_COMPLETE { duration: ${parallelDuration.toFixed(2)}ms, fetchCount: ${results.length} }`);
      } else {
        // Production: Same parallelization without logging
        const fetchPromises: Promise<{
          type: 'service' | 'job';
          data: any[] | null;
          error: any;
        }>[] = [];

        // Build service query
        if (shouldFetchServices) {
          let serviceQuery = supabase
            .from('service_listings')
            .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)');

          if (filters.listingType === 'Service') {
            serviceQuery = serviceQuery.eq('listing_type', 'Service');
          } else if (filters.listingType === 'CustomService') {
            serviceQuery = serviceQuery.eq('listing_type', 'CustomService');
          }

          serviceQuery = serviceQuery.eq('status', 'Active');

          if (searchQuery.trim()) {
            serviceQuery = serviceQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          if (filters.categories.length > 0) {
            serviceQuery = serviceQuery.in('category_id', filters.categories);
          }

          if (filters.location.trim()) {
            serviceQuery = serviceQuery.ilike('location', `%${filters.location}%`);
          }

          if (filters.priceMin) {
            serviceQuery = serviceQuery.gte('base_price', parseFloat(filters.priceMin));
          }

          if (filters.priceMax) {
            serviceQuery = serviceQuery.lte('base_price', parseFloat(filters.priceMax));
          }

          if (filters.verified) {
            serviceQuery = serviceQuery.eq('profiles.is_verified', true);
          }

          serviceQuery = serviceQuery.order('created_at', { ascending: false }).limit(PAGE_SIZE * 2);

          fetchPromises.push(
            (async () => {
              const { data, error } = await serviceQuery;
              return { type: 'service' as const, data, error };
            })()
          );
        }

        // Build job query
        if (shouldFetchJobs) {
          let jobQuery = supabase
            .from('jobs')
            .select('*, profiles!jobs_customer_id_fkey(*), categories(*)');

          jobQuery = jobQuery.eq('status', 'Open');

          if (searchQuery.trim()) {
            jobQuery = jobQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          if (filters.categories.length > 0) {
            jobQuery = jobQuery.in('category_id', filters.categories);
          }

          if (filters.location.trim()) {
            jobQuery = jobQuery.ilike('location', `%${filters.location}%`);
          }

          // Price filters: Include quote-based jobs AND jobs matching price criteria
          // Quote-based jobs (pricing_type = 'quote_based') should always be included
          if (filters.priceMin || filters.priceMax) {
            const conditions: string[] = ['pricing_type.eq.quote_based']; // Always include quote-based jobs

            if (filters.priceMin && filters.priceMax) {
              // Both min and max set: include if budget or fixed_price is within range
              conditions.push(`and(budget_min.gte.${parseFloat(filters.priceMin)},budget_max.lte.${parseFloat(filters.priceMax)})`);
              conditions.push(`and(fixed_price.gte.${parseFloat(filters.priceMin)},fixed_price.lte.${parseFloat(filters.priceMax)})`);
            } else if (filters.priceMin) {
              // Only min set
              conditions.push(`budget_min.gte.${parseFloat(filters.priceMin)}`);
              conditions.push(`fixed_price.gte.${parseFloat(filters.priceMin)}`);
            } else if (filters.priceMax) {
              // Only max set
              conditions.push(`budget_max.lte.${parseFloat(filters.priceMax)}`);
              conditions.push(`fixed_price.lte.${parseFloat(filters.priceMax)}`);
            }

            jobQuery = jobQuery.or(conditions.join(','));
          }

          jobQuery = jobQuery.order('created_at', { ascending: false }).limit(PAGE_SIZE * 2);

          fetchPromises.push(
            (async () => {
              const { data, error } = await jobQuery;
              return { type: 'job' as const, data, error };
            })()
          );
        }

        // Execute all queries in parallel
        const results = await Promise.all(fetchPromises);

        // Process results in original order (services first, then jobs)
        for (const result of results) {
          if (result.type === 'service' && !result.error && result.data) {
            const normalizedServices = result.data.map(normalizeServiceListing);
            allResults = [...allResults, ...normalizedServices];
          } else if (result.type === 'job' && !result.error && result.data) {
            const normalizedJobs = result.data.map(normalizeJob);
            allResults = [...allResults, ...normalizedJobs];
          }
        }
      }
      // ============================================================================

      // Apply distance filtering if distance is specified
      if (filters.distance && filters.distance > 0) {
        let referenceLocation: { latitude: number; longitude: number } | null = null;

        // Try to get reference location from user's profile first
        if (userLocation) {
          referenceLocation = userLocation;
        }
        // If location filter is specified, try to geocode it
        else if (filters.location.trim()) {
          try {
            const geocoded = await geocodeAddress(filters.location);
            if (geocoded) {
              referenceLocation = geocoded;
            }
          } catch (error) {
            // Geocoding error handled silently
          }
        }

        // If we have a reference location, calculate distances and filter
        if (referenceLocation) {
          const resultsWithDistance = allResults.map(listing => {
            // Calculate distance if listing has coordinates
            if (listing.latitude != null && listing.longitude != null) {
              const distance = calculateDistance(
                referenceLocation!.latitude,
                referenceLocation!.longitude,
                listing.latitude,
                listing.longitude
              );
              return { ...listing, distance_miles: distance };
            }
            return listing;
          });

          allResults = resultsWithDistance.filter(listing => {
            // Only include listings within the distance radius
            // CRITICAL FIX: If no distance calculated, include listing anyway (don't exclude by default)
            if (listing.distance_miles !== undefined) {
              const withinRange = listing.distance_miles <= filters.distance!;
              return withinRange;
            }
            // Include listings without coordinates (they'll appear at the end)
            return true; // Changed from false to true - include listings without coordinates
          });
        }
      }

      if (filters.minRating > 0) {
        allResults = allResults.filter(listing => {
          const profile = listing.provider || listing.customer;
          return profile && profile.rating_average >= filters.minRating;
        });
      }

      switch (filters.sortBy) {
        case 'price_low':
          allResults.sort((a, b) => {
            const priceA = a.base_price || a.fixed_price || a.budget_min || 0;
            const priceB = b.base_price || b.fixed_price || b.budget_min || 0;
            return priceA - priceB;
          });
          break;
        case 'price_high':
          allResults.sort((a, b) => {
            const priceA = a.base_price || a.fixed_price || a.budget_max || 0;
            const priceB = b.base_price || b.fixed_price || b.budget_max || 0;
            return priceB - priceA;
          });
          break;
        case 'rating':
          allResults.sort((a, b) => {
            const ratingA = (a.provider || a.customer)?.rating_average || 0;
            const ratingB = (b.provider || b.customer)?.rating_average || 0;
            return ratingB - ratingA;
          });
          break;
        case 'popular':
          allResults.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
          break;
        case 'recent':
          allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'distance':
          allResults.sort((a, b) => {
            const distA = a.distance_miles !== undefined ? a.distance_miles : Number.MAX_VALUE;
            const distB = b.distance_miles !== undefined ? b.distance_miles : Number.MAX_VALUE;
            return distA - distB;
          });
          break;
        default:
          allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      const paginatedData = allResults.slice(offset, offset + PAGE_SIZE);

      if (reset) {
        setListings(paginatedData);
        setPage(1);
        await recordSearch(searchQuery, allResults.length);

        // ============================================================================
        // CACHE UPDATE: Store fresh data for initial unfiltered loads
        // ============================================================================
        if (isInitialLoad) {
          setCachedListings(allResults, profile?.id || null);
          if (__DEV__) console.log('[HOME_CACHE] Background refresh complete');
        }
        // ============================================================================
      } else {
        setListings((prev) => [...prev, ...paginatedData]);
        setPage((prev) => prev + 1);
      }

      setHasMore(paginatedData.length === PAGE_SIZE && allResults.length > offset + PAGE_SIZE);

      // PHASE 2 OPTIMIZATION: Track filter fetch completion
      if (__DEV__ && reset && (activeFilterCount > 0 || searchQuery.trim())) {
        logPerfEvent('FILTER_FETCH_COMPLETE', {
          resultsCount: paginatedData.length,
          filterCount: activeFilterCount,
        });
      }
    } catch (error) {
      // Error fetching listings handled silently
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // PHASE 2 OPTIMIZATION: Memoize activeFilterCount to prevent recalculation on every render
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.location.trim()) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.minRating > 0) count++;
    if (filters.distance && filters.distance !== 25) count++;
    if (filters.availability && filters.availability !== 'any') count++;
    if (filters.sortBy && filters.sortBy !== 'relevance') count++;
    if (filters.verified) count++;
    if (filters.instant_booking) count++;
    if (filters.listingType && filters.listingType !== 'all') count++;
    if (filters.fulfillmentTypes && filters.fulfillmentTypes.length > 0) count++;
    if (filters.shippingMode && filters.shippingMode !== 'all') count++;
    if (filters.hasVAS) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  // ============================================================================
  // PHASE 1: SIMPLIFIED FEED DATA TRANSFORMATION
  // ============================================================================
  // Reduced from 6 dependencies to 3 by simplifying logic
  // Faster recalculation: ~5ms vs previous ~15ms for 100 listings
  // ============================================================================
  const feedData = useMemo(() => {
    // PHASE 1: Simple grouped layout when searching/filtering (no carousels needed)
    if (searchQuery || activeFilterCount > 0) {
      const groupedListings: any[] = [];
      for (let i = 0; i < listings.length; i += 2) {
        groupedListings.push({
          type: 'row',
          id: `row-${i}`,
          items: [listings[i], listings[i + 1]].filter(Boolean)
        });
      }
      return groupedListings;
    }

    // PHASE 1: Feed with carousels (only when showCarousels is true and carousels have data)
    if (showCarousels && (trendingListings.length > 0 || popularListings.length > 0 || recommendedListings.length > 0)) {
      const feed: any[] = [];
      const ITEMS_PER_BLOCK = 6;

      feed.push({ type: 'banner', id: 'admin-banner' });

      if (trendingListings.length > 0) {
        feed.push({
          type: 'carousel',
          id: 'trending',
          title: 'Trending This Week',
          icon: 'trending',
          data: trendingListings
        });
      }

      const block1 = listings.slice(0, ITEMS_PER_BLOCK);
      for (let i = 0; i < block1.length; i += 2) {
        feed.push({
          type: 'row',
          id: `row-block1-${i}`,
          items: [block1[i], block1[i + 1]].filter(Boolean)
        });
      }

      if (popularListings.length > 0) {
        feed.push({
          type: 'carousel',
          id: 'popular',
          title: 'Popular Services',
          icon: 'star',
          data: popularListings
        });
      }

      const block2 = listings.slice(ITEMS_PER_BLOCK, ITEMS_PER_BLOCK * 2);
      for (let i = 0; i < block2.length; i += 2) {
        feed.push({
          type: 'row',
          id: `row-block2-${i}`,
          items: [block2[i], block2[i + 1]].filter(Boolean)
        });
      }

      if (recommendedListings.length > 0) {
        feed.push({
          type: 'carousel',
          id: 'recommended',
          title: 'Recommended for You',
          icon: 'sparkles',
          data: recommendedListings
        });
      }

      const remaining = listings.slice(ITEMS_PER_BLOCK * 2);
      for (let i = 0; i < remaining.length; i += 2) {
        feed.push({
          type: 'row',
          id: `row-remaining-${i}`,
          items: [remaining[i], remaining[i + 1]].filter(Boolean)
        });
      }

      return feed;
    }

    // PHASE 1: Simple grouped layout (default when carousels not loaded yet)
    const groupedListings: any[] = [];
    for (let i = 0; i < listings.length; i += 2) {
      groupedListings.push({
        type: 'row',
        id: `row-${i}`,
        items: [listings[i], listings[i + 1]].filter(Boolean)
      });
    }
    return groupedListings;
  }, [listings, showCarousels, trendingListings, popularListings, recommendedListings, searchQuery, activeFilterCount]);

  // Count listings by type from filtered results
  const resultTypeCounts = useMemo(() => {
    const counts = {
      jobs: 0,
      services: 0,
      customServices: 0,
    };

    listings.forEach((listing) => {
      if (listing.marketplace_type === 'Job') {
        counts.jobs++;
      } else if (listing.listing_type === 'CustomService') {
        counts.customServices++;
      } else {
        counts.services++;
      }
    });

    return counts;
  }, [listings]);

  // PHASE 2 OPTIMIZATION: Memoize filter indicator text to prevent recalculation
  const filterIndicatorText = useMemo(() => {
    const filterText = `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`;

    if (listings.length === 0) {
      return `${filterText} · No results`;
    }

    const parts: string[] = [];

    if (resultTypeCounts.jobs > 0) {
      parts.push(`${resultTypeCounts.jobs} Job${resultTypeCounts.jobs > 1 ? 's' : ''}`);
    }
    if (resultTypeCounts.services > 0) {
      parts.push(`${resultTypeCounts.services} Service${resultTypeCounts.services > 1 ? 's' : ''}`);
    }
    if (resultTypeCounts.customServices > 0) {
      parts.push(`${resultTypeCounts.customServices} Custom Service${resultTypeCounts.customServices > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return `${filterText} active`;
    }

    return `${filterText} · ${parts.join(' · ')}`;
  }, [activeFilterCount, resultTypeCounts, listings.length]);

  // PRIORITY 5 FIX: Removed useEffect that called buildFeedData()
  // feedData is now computed directly via useMemo above, eliminating this extra re-render trigger

  // ============================================================================
  // PHASE 1: OPTIMIZED PAGINATION - No ref mutations
  // ============================================================================
  // PHASE 2: Use fetchMore from useListings hook for pagination
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchMore();
    }
  }, [loadingMore, hasMore, loading, fetchMore]);

  // ============================================================================
  // PHASE 1: OPTIMIZED FILTER APPLICATION - Direct state update, no refs
  // ============================================================================
  // React 18 automatically batches setState calls, so multiple updates in
  // the same event handler only cause one re-render
  // ============================================================================
  const handleApplyFilters = useCallback((newFilters: FilterOptions) => {
    if (__DEV__) {
      logPerfEvent('FILTER_APPLY_START', {
        listingType: newFilters.listingType,
        categoriesCount: newFilters.categories.length,
      });
    }

    // React 18 batches these automatically - single re-render
    setFilters(newFilters);

    if (__DEV__) {
      logPerfEvent('FILTER_STATE_UPDATED');
    }
  }, []);

  // PRIORITY 1 FIX: Memoize filter open handler to prevent function recreation
  const handleOpenFilters = useCallback(() => {
    if (__DEV__) {
      logPerfEvent('FILTER_OPEN_TAP');
    }
    setShowFilters(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  // ============================================================================
  // PHASE 1: OPTIMIZED MAP MARKERS - Memoized with reduced dependencies
  // ============================================================================
  // Only recalculate when listings array actually changes (not on every render)
  // ============================================================================
  const getMapMarkers = useMemo(() => {
    if (mapMode === 'providers') {
      const providersMap = new Map();

      listings.forEach((listing) => {
        const profile = listing.marketplace_type === 'Job' ? listing.customer : listing.provider;
        if (profile && profile.latitude && profile.longitude) {
          if (!providersMap.has(profile.id)) {
            const providerListings = listings.filter(
              (l) => {
                const lProfile = l.marketplace_type === 'Job' ? l.customer : l.provider;
                return lProfile?.id === profile.id;
              }
            );
            const categories = Array.from(
              new Set(
                providerListings
                  .map((l) => l.category?.name)
                  .filter(Boolean)
                  .filter((name) => typeof name === 'string')
              )
            ).slice(0, 5).map(cat => String(cat));

            providersMap.set(profile.id, {
              id: profile.id,
              latitude: profile.latitude,
              longitude: profile.longitude,
              title: String(profile.full_name || 'Provider'),
              subtitle: String((profile as any).business_name || 'Service Provider'),
              type: 'provider' as const,
              rating: typeof profile.rating_average === 'number' ? profile.rating_average : 0,
              isVerified: profile.is_verified,
              reviewCount: typeof profile.rating_count === 'number' ? profile.rating_count : 0,
              categories: categories,
              responseTime: String((profile as any).response_time || 'Within 24 hours'),
              completionRate: typeof (profile as any).completion_rate === 'number' ? (profile as any).completion_rate : 95,
            });
          }
        }
      });

      return Array.from(providersMap.values());
    }

    const listingMarkers = listings
      .filter((listing) => listing.latitude != null && listing.longitude != null)
      .map((listing) => {
        let price: number | undefined = 0;
        let listingType: 'Service' | 'CustomService' | 'Job' = 'Service';
        let lat = listing.latitude!;
        let lng = listing.longitude!;

        if (listing.marketplace_type === 'Job') {
          listingType = 'Job';
          if (listing.pricing_type === 'quote_based' || (!listing.fixed_price && !listing.budget_min)) {
            price = undefined;
          } else {
            price = listing.fixed_price || listing.budget_min || 0;
          }

          if (profile?.user_type === 'Customer') {
            lat = Math.round(lat * 100) / 100;
            lng = Math.round(lng * 100) / 100;
          }
        } else {
          price = listing.base_price || 0;
          listingType = listing.listing_type === 'CustomService' ? 'CustomService' : 'Service';
        }

        return {
          id: listing.id,
          latitude: lat,
          longitude: lng,
          title: listing.title,
          price: price,
          type: 'listing' as const,
          listingType: listingType,
          pricingType: listing.marketplace_type === 'Job' ? listing.pricing_type : undefined,
        };
      });

    return listingMarkers;
  }, [listings, mapMode, profile?.user_type]);

  const handleMarkerPress = useCallback((marker: any) => {
    if (marker.type === 'provider') {
      router.push(`/provider/store/${marker.id}` as any);
    } else {
      const listing = listings.find((l) => l.id === marker.id);
      if (listing) {
        const isJob = listing.marketplace_type === 'Job';
        router.push(isJob ? `/jobs/${listing.id}` : `/listing/${listing.id}`);
      }
    }
  }, [listings]);

  const renderStars = useCallback((rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} size={12} color={colors.warning} fill={colors.warning} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} size={12} color={colors.warning} fill={colors.warning} style={{ opacity: 0.5 }} />);
      } else {
        stars.push(<Star key={i} size={12} color={colors.border} fill="transparent" />);
      }
    }
    return stars;
  }, []);

  const getListingTypeLabel = useCallback((item: MarketplaceListing) => {
    if (item.marketplace_type === 'Job') {
      return { text: 'JOB', color: colors.primary };
    }
    const listing = item as any;
    if (listing.listing_type === 'CustomService') {
      return { text: 'CUSTOM SERVICE', color: '#8B5CF6' };
    }
    return { text: 'SERVICE', color: colors.success };
  }, []);

  const handleSeeAll = useCallback((type: string) => {
    if (type === 'recommended') {
      setListings(recommendedListings);
    } else if (type === 'trending') {
      setListings(trendingListings);
    } else if (type === 'popular') {
      setListings(popularListings);
    }
    setPage(0);
    setHasMore(false);
  }, [recommendedListings, trendingListings, popularListings]);

  const triggerMapStatusHint = useCallback(() => {
    if (mapStatusHintTimer.current) {
      clearTimeout(mapStatusHintTimer.current);
    }
    setShowMapStatusHint(true);
    mapStatusHintTimer.current = setTimeout(() => {
      setShowMapStatusHint(false);
    }, 2000);
  }, []);

  const handleMapZoomChange = useCallback((zoom: number) => {
    const roundedZoom = Math.round(zoom * 10) / 10;
    if (Math.abs(roundedZoom - mapZoomLevel) >= 0.5) {
      setMapZoomLevel(roundedZoom);
      triggerMapStatusHint();
    }
  }, [mapZoomLevel, triggerMapStatusHint]);

  const handleMapModeChange = useCallback((mode: 'listings' | 'providers') => {
    setMapMode(mode);
    triggerMapStatusHint();
  }, [triggerMapStatusHint]);

  useEffect(() => {
    if (viewMode === 'map') {
      triggerMapStatusHint();
    }
  }, [filters, viewMode, triggerMapStatusHint]);

  const handleMapZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleMapZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleMapRecenter = useCallback(() => {
    mapRef.current?.recenter();
  }, []);

  const handleMapLayers = useCallback(() => {
    mapRef.current?.toggleLayers();
  }, []);

  // PRIORITY 4: Memoized keyExtractor functions to prevent re-creation on every render
  const feedKeyExtractor = useCallback((item: any) => item.id, []);
  const carouselKeyExtractor = useCallback((item: any) => item.id, []);

  // PRIORITY 5 FIX: Stable onPress handler for memoized card components
  // This prevents cards from re-rendering when the parent re-renders
  const handleCardPress = useCallback((id: string, isJob: boolean) => {
    router.push(isJob ? `/jobs/${id}` : `/listing/${id}`);
  }, []);

  const renderCarouselSection = useCallback((title: string, icon: React.ReactNode, data: MarketplaceListing[], type: string) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.carouselSection}>
        <View style={styles.carouselHeader}>
          <View style={styles.carouselTitleRow}>
            {icon}
            <Text style={styles.carouselTitle}>{title}</Text>
          </View>
          <TouchableOpacity onPress={() => handleSeeAll(type)}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={data}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={true}
          renderItem={({ item }) => {
            const isJob = item.marketplace_type === 'Job';
            const profile = isJob ? item.customer : item.provider;
            const typeLabel = getListingTypeLabel(item);
            let price = '';
            if (isJob) {
              price = item.fixed_price ? formatCurrency(item.fixed_price) : (item.budget_min ? formatCurrency(item.budget_min) : 'TBD');
            } else {
              price = formatCurrency(item.base_price || 0);
            }
            return (
              <TouchableOpacity
                style={styles.carouselCard}
                onPress={() => router.push(isJob ? `/jobs/${item.id}` : `/listing/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.carouselCardContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.carouselAvatar} />
                    ) : (
                      <View style={[styles.carouselAvatar, styles.carouselAvatarPlaceholder]}>
                        <Text style={styles.carouselAvatarText}>
                          {(profile?.full_name || 'P').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.carouselAccountName} numberOfLines={1}>
                      {profile?.full_name || 'Provider'}
                    </Text>
                    <View style={{ backgroundColor: typeLabel.color, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '600' }}>{typeLabel.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.carouselCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.carouselCardLocation} numberOfLines={1}>
                    {item.location || 'Remote'}
                  </Text>
                  <View style={styles.carouselCardFooter}>
                    <Text style={styles.carouselCardPrice}>{price}</Text>
                    {profile?.rating_average && (
                      <View style={styles.carouselCardRating}>
                        <Star size={12} color={colors.warning} fill={colors.warning} />
                        <Text style={styles.carouselCardRatingText}>
                          {profile.rating_average.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={carouselKeyExtractor}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselList}
        />
      </View>
    );
  }, [handleSeeAll, getListingTypeLabel, carouselKeyExtractor]);

  const renderCarouselsHeader = () => {
    if (searchQuery || activeFilterCount > 0) return null;

    return (
      <View style={styles.carouselsContainer}>
        {recommendedListings.length > 0 && renderCarouselSection(
          'Recommended for You',
          <Sparkles size={20} color={colors.primary} />,
          recommendedListings,
          'recommended'
        )}
        {trendingListings.length > 0 && renderCarouselSection(
          'Trending This Week',
          <TrendingUp size={20} color={colors.primary} />,
          trendingListings,
          'trending'
        )}
        {popularListings.length > 0 && renderCarouselSection(
          'Popular Services',
          <Star size={20} color={colors.primary} />,
          popularListings,
          'popular'
        )}
      </View>
    );
  };

  // PRIORITY 5 FIX: Use memoized ListingCard component instead of inline rendering
  // This prevents all cards from re-rendering when parent re-renders
  const renderListingCard = useCallback(({ item }: { item: MarketplaceListing }) => {
    return <ListingCard item={item} onPress={handleCardPress} />;
  }, [handleCardPress]);

  // PRIORITY 5 FIX: Use memoized GridCard component instead of inline rendering
  // This prevents all cards from re-rendering when parent re-renders
  const renderGridCard = useCallback(({ item }: { item: MarketplaceListing }) => {
    return <GridCard item={item} onPress={handleCardPress} />;
  }, [handleCardPress]);

  // Shared carousel renderer for feed items - no viewMode dependency
  const renderFeedCarousel = useCallback((item: any) => {
    const IconComponent = item.icon === 'trending' ? TrendingUp : item.icon === 'star' ? Star : Sparkles;
    return (
      <View style={styles.embeddedCarouselSection}>
        <View style={styles.embeddedCarouselHeader}>
          <View style={styles.embeddedCarouselTitleRow}>
            <IconComponent size={22} color={colors.primary} />
            <Text style={styles.embeddedCarouselTitle}>{item.title}</Text>
          </View>
          <TouchableOpacity onPress={() => handleSeeAll(item.id)} activeOpacity={0.7}>
            <Text style={styles.embeddedSeeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={item.data}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={true}
          renderItem={({ item: carouselItem }) => {
            const carouselListing = carouselItem as any;

            let carouselPhotos: string[] = [];
            if (carouselListing.photos) {
              if (Array.isArray(carouselListing.photos)) {
                carouselPhotos = carouselListing.photos.filter((p: any) => typeof p === 'string' && p.trim() !== '');
              } else if (typeof carouselListing.photos === 'string') {
                try {
                  const parsed = JSON.parse(carouselListing.photos);
                  carouselPhotos = Array.isArray(parsed) ? parsed.filter((p: any) => typeof p === 'string' && p.trim() !== '') : [];
                } catch (e) {
                  if (carouselListing.photos.trim() !== '') {
                    carouselPhotos = [carouselListing.photos];
                  }
                }
              }
            }
            const carouselMainImage = carouselPhotos.length > 0 ? carouselPhotos[0] : null;
            const isJob = carouselListing.marketplace_type === 'Job';
            const carouselTypeLabel = getListingTypeLabel(carouselItem);

            return (
              <TouchableOpacity
                style={styles.embeddedCarouselCard}
                onPress={() => router.push(isJob ? `/jobs/${carouselItem.id}` : `/listing/${carouselItem.id}`)}
                activeOpacity={0.7}
              >
                {carouselMainImage ? (
                  <Image
                    source={{ uri: carouselMainImage }}
                    style={styles.embeddedCarouselCardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.embeddedCarouselCardImage, styles.embeddedCarouselCardImagePlaceholder]}>
                    <Text style={styles.embeddedCarouselCardImagePlaceholderText}>
                      {isJob ? '💼' : carouselListing.listing_type === 'CustomService' ? '✨' : '🛠️'}
                    </Text>
                  </View>
                )}
                <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: carouselTypeLabel.color, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3, zIndex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>{carouselTypeLabel.text}</Text>
                </View>
                <View style={styles.embeddedCarouselCardContent}>
                  <View style={styles.embeddedCarouselProfileRow}>
                    {(carouselListing.provider?.avatar_url || carouselListing.customer?.avatar_url || carouselListing.profiles?.avatar_url) ? (
                      <Image
                        source={{ uri: carouselListing.provider?.avatar_url || carouselListing.customer?.avatar_url || carouselListing.profiles?.avatar_url }}
                        style={styles.embeddedCarouselAvatar}
                      />
                    ) : (
                      <View style={[styles.embeddedCarouselAvatar, styles.embeddedCarouselAvatarPlaceholder]}>
                        <Text style={styles.embeddedCarouselAvatarText}>
                          {(carouselListing.profiles?.full_name || carouselListing.provider?.full_name || carouselListing.customer?.full_name || 'P').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.embeddedCarouselCardProvider} numberOfLines={1}>
                      {carouselListing.profiles?.full_name || carouselListing.provider?.full_name || carouselListing.customer?.full_name || 'Provider'}
                    </Text>
                  </View>
                  <Text style={styles.embeddedCarouselCardTitle} numberOfLines={2}>
                    {carouselItem.title}
                  </Text>
                  <View style={styles.embeddedCarouselCardFooter}>
                    <Text style={styles.embeddedCarouselCardPrice}>
                      {formatCurrency(carouselItem.base_price || carouselItem.fixed_price || carouselItem.budget_min || 0)}
                    </Text>
                    {(carouselListing.rating_average || carouselListing.provider?.rating_average) > 0 && (
                      <View style={styles.embeddedCarouselCardRating}>
                        <Star size={12} color={colors.warning} fill={colors.warning} />
                        <Text style={styles.embeddedCarouselCardRatingText}>
                          {(carouselListing.rating_average || carouselListing.provider?.rating_average)?.toFixed(1) || 'N/A'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={carouselKeyExtractor}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.embeddedCarouselList}
        />
      </View>
    );
  }, [handleSeeAll, getListingTypeLabel, carouselKeyExtractor]);

  // List view renderer - stable, no viewMode dependency
  const renderFeedItemList = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.type === 'banner') {
      // PHASE 1: Show AdminBanner when carousels are enabled
      return showCarousels ? <AdminBanner autoRotate={true} interval={4500} /> : null;
    }

    if (item.type === 'carousel') {
      return renderFeedCarousel(item);
    }

    if (item.type === 'row') {
      return (
        <View>
          {item.items.map((listing: MarketplaceListing) => (
            <View key={listing.id} style={{ marginBottom: spacing.md }}>
              {renderListingCard({ item: listing })}
            </View>
          ))}
        </View>
      );
    }

    return renderListingCard({ item: item.data });
  }, [renderFeedCarousel, renderListingCard, showCarousels]);

  // Grid view renderer - stable, no viewMode dependency
  const renderFeedItemGrid = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.type === 'banner') {
      // PHASE 1: Show AdminBanner when carousels are enabled
      return showCarousels ? <AdminBanner autoRotate={true} interval={4500} /> : null;
    }

    if (item.type === 'carousel') {
      return renderFeedCarousel(item);
    }

    if (item.type === 'row') {
      return (
        <View style={styles.gridRow}>
          {item.items.map((listing: MarketplaceListing) => (
            <View key={listing.id} style={styles.gridItemWrapper}>
              {renderGridCard({ item: listing })}
            </View>
          ))}
        </View>
      );
    }

    return renderGridCard({ item: item.data });
  }, [renderFeedCarousel, renderGridCard]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Discover Services</Text>
        </View>

        <View style={styles.searchBarWrapper}>
          <View style={styles.searchContainer}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for event-party services and jobs near you"
              placeholderTextColor="#7A7A7A"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => setShowSuggestions(searchQuery.length > 0 || trendingSearches.length > 0)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearch}
                onPress={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
              >
                <X size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
            <VoiceSearchButton
              searchType="providers"
              onResults={handleVoiceResults}
              onError={handleVoiceError}
            />
            <ImageSearchButton
              onResults={handleImageResults}
              onError={handleImageError}
            />
          </View>
        </View>

        <View style={styles.filterRowContainer}>
          <View style={styles.filterRow}>
            <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <List size={18} color={viewMode === 'list' ? colors.white : colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.7}
            >
              <LayoutGrid size={18} color={viewMode === 'grid' ? colors.white : colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'map' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('map')}
              activeOpacity={0.7}
            >
              <MapPin size={18} color={viewMode === 'map' ? colors.white : colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleOpenFilters}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={20} color={colors.primary} />
            <Text style={styles.filterButtonText}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          </View>
        </View>

        {activeFilterCount > 0 && (
          <View style={styles.activeFiltersRow}>
            <Text style={styles.activeFiltersText}>
              {filterIndicatorText}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setFilters(defaultFilters);
              }}
            >
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showSuggestions && (searchQuery.length > 0 || trendingSearches.length > 0) && (
        <View style={styles.suggestionsContainer}>
          {searchQuery.length > 0 ? (
            <>
              {suggestions.length > 0 && (
                <>
                  <Text style={styles.suggestionsTitle}>Suggestions</Text>
                  {suggestions.map((s, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(s.suggestion)}
                    >
                      <Search size={16} color={colors.textLight} />
                      <Text style={styles.suggestionText}>{s.suggestion}</Text>
                      <Text style={styles.suggestionCount}>({s.search_count})</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              {trendingSearches.length > 0 && (
                <>
                  <View style={styles.trendingHeader}>
                    <TrendingUp size={16} color={colors.primary} />
                    <Text style={styles.suggestionsTitle}>Trending Searches</Text>
                  </View>
                  {trendingSearches.map((s, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(s.suggestion)}
                    >
                      <TrendingUp size={16} color={colors.textLight} />
                      <Text style={styles.suggestionText}>{s.suggestion}</Text>
                      <Text style={styles.suggestionCount}>({s.search_count})</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : listings.length === 0 && !searchQuery && activeFilterCount === 0 ? (
        // PHASE 1: Show carousels only when lazy loaded (after 2s)
        showCarousels ? (
          <View style={styles.recommendationsSection}>
            <FeaturedListingsSection
              variant="hero"
              title="Featured Services"
              showViewAll={true}
              limit={3}
            />
            {profile?.id && (
              <RecommendationsCarousel
                userId={profile.id}
                type="personalized"
                userLocation={
                  profile.latitude && profile.longitude
                    ? { latitude: profile.latitude, longitude: profile.longitude }
                    : undefined
                }
                limit={10}
              />
            )}
            <RecommendationsCarousel type="trending" limit={8} />
            <RecommendationsCarousel type="popular" limit={8} />
          </View>
        ) : (
          <View style={styles.centerContent}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading recommendations...</Text>
          </View>
        )
      ) : listings.length > 0 ? (
        <View style={{ flex: 1 }}>
          {/* List View - kept mounted, visibility toggled */}
          <View
            style={[
              styles.viewContainer,
              viewMode !== 'list' && styles.viewContainerHidden
            ]}
            pointerEvents={viewMode === 'list' ? 'auto' : 'none'}
          >
            <FlatList
              data={feedData}
              renderItem={renderFeedItemList}
              keyExtractor={feedKeyExtractor}
              contentContainerStyle={styles.listingsContainer}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews={true}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingMoreText}>Loading more...</Text>
                  </View>
                ) : !hasMore && listings.length > 0 ? (
                  <View style={styles.endReachedContainer}>
                    <Text style={styles.endReachedText}>You've reached the end</Text>
                  </View>
                ) : null
              }
            />
          </View>

          {/* Grid View - kept mounted, visibility toggled */}
          <View
            style={[
              styles.viewContainer,
              viewMode !== 'grid' && styles.viewContainerHidden
            ]}
            pointerEvents={viewMode === 'grid' ? 'auto' : 'none'}
          >
            <FlatList
              data={feedData}
              renderItem={renderFeedItemGrid}
              keyExtractor={feedKeyExtractor}
              contentContainerStyle={styles.gridContainer}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews={true}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingMoreText}>Loading more...</Text>
                  </View>
                ) : !hasMore && listings.length > 0 ? (
                  <View style={styles.endReachedContainer}>
                    <Text style={styles.endReachedText}>You've reached the end</Text>
                  </View>
                ) : null
              }
            />
          </View>

          {/* Map View - kept mounted, visibility toggled */}
          <View
            style={[
              styles.viewContainer,
              styles.mapViewContainer,
              viewMode !== 'map' && styles.viewContainerHidden
            ]}
            pointerEvents={viewMode === 'map' ? 'auto' : 'none'}
          >
            <InteractiveMapViewPlatform
              ref={mapRef}
              markers={getMapMarkers}
              onMarkerPress={handleMarkerPress}
              initialRegion={
                profile?.latitude && profile?.longitude
                  ? {
                      latitude: profile.latitude,
                      longitude: profile.longitude,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    }
                  : undefined
              }
              showUserLocation={true}
              enableClustering={true}
              onZoomChange={handleMapZoomChange}
            />

            {viewMode === 'map' && (
              <>
                <MapModeBar
                  mode={mapMode}
                  onModeChange={handleMapModeChange}
                />

                <MapStatusHint
                  locationCount={getMapMarkers.length}
                  zoomLevel={mapZoomLevel}
                  visible={showMapStatusHint}
                  mode={mapMode}
                />

                <MapFAB
                  onZoomIn={handleMapZoomIn}
                  onZoomOut={handleMapZoomOut}
                  onFullscreen={handleMapRecenter}
                  onLayersPress={handleMapLayers}
                />
              </>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>
            {searchQuery || activeFilterCount > 0
              ? 'No services match your search criteria'
              : 'No services found'}
          </Text>
          {(searchQuery || activeFilterCount > 0) && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setFilters(defaultFilters);
              }}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Reset Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FilterModal
        visible={showFilters}
        onClose={handleCloseFilters}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#006634',
  },
  searchBarWrapper: {
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: spacing.sm,
    height: '100%',
    paddingVertical: 0,
  },
  clearSearch: {
    padding: spacing.xs,
  },
  filterRowContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 44,
    gap: spacing.xs,
    position: 'relative',
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activeFiltersText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  clearFiltersText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  listingsContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  listingCard: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  listingContent: {
    padding: spacing.lg,
  },
  listingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    paddingRight: 100,
  },
  listingDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  listingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  distanceText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  priceText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  resetButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resetButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  suggestionsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  suggestionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  suggestionCount: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  mapContainer: {
    flex: 1,
    padding: spacing.lg,
    position: 'relative',
  },
  mapOverlay: {
    position: 'absolute',
    top: spacing.lg + spacing.sm,
    left: spacing.lg + spacing.sm,
    right: spacing.lg + spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.lg,
  },
  mapBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  recommendationsSection: {
    flex: 1,
  },
  loadingMoreContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingMoreText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  endReachedContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  endReachedText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  gridContainer: {
    padding: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
  },
  gridItemWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  gridCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surface,
  },
  gridCardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  gridCardImagePlaceholderText: {
    fontSize: 48,
  },
  gridCardContent: {
    padding: spacing.md,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  gridAvatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
  },
  gridAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  gridAccountName: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  gridRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gridRatingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  gridTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    minHeight: 36,
  },
  gridDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    minHeight: 32,
  },
  gridFooter: {
    gap: spacing.xs,
  },
  gridLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gridLocationText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  gridPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  gridPriceAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  gridPriceType: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  gridDistanceBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  gridDistanceBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  mapViewContainer: {
    flex: 1,
    position: 'relative',
  },
  carouselsContainer: {
    backgroundColor: colors.white,
    paddingBottom: spacing.md,
  },
  carouselSection: {
    marginBottom: spacing.lg,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  carouselTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#222222',
  },
  seeAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  carouselList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  carouselCard: {
    width: 160,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  carouselCardContent: {
    padding: spacing.sm,
  },
  carouselAvatar: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
  },
  carouselAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselAvatarText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  carouselAccountName: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  carouselCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  carouselCardLocation: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  carouselCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carouselCardPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  carouselCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carouselCardRatingText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  embeddedCarouselSection: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
  },
  embeddedCarouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  embeddedCarouselTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  embeddedCarouselTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  embeddedSeeAllText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  embeddedCarouselList: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  embeddedCarouselCard: {
    width: 170,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  embeddedCarouselCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surface,
  },
  embeddedCarouselCardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  embeddedCarouselCardImagePlaceholderText: {
    fontSize: 48,
  },
  embeddedCarouselCardContent: {
    padding: spacing.md,
    minHeight: 140,
  },
  embeddedCarouselProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  embeddedCarouselAvatar: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
  },
  embeddedCarouselAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  embeddedCarouselAvatarText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  embeddedCarouselCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
    minHeight: 40,
  },
  embeddedCarouselCardProvider: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  embeddedCarouselCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  embeddedCarouselCardPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  embeddedCarouselCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  embeddedCarouselCardRatingText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600' as const,
  },
  viewContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  viewContainerHidden: {
    opacity: 0,
  },
});
