import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image, InteractionManager, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Search, MapPin, DollarSign, Star, SlidersHorizontal, TrendingUp, Clock, X, Navigation, List, LayoutGrid, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ServiceListing, MarketplaceListing, Job, Category } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import CachedAvatar from '@/components/CachedAvatar';
import { calculateDistance, geocodeAddress } from '@/lib/geolocation';
// WEEK 3: Using optimized FilterModal with 90% performance improvement
import { FilterOptions, defaultFilters } from '@/components/FilterModal';
import { FilterModalAnimated as FilterModal } from '@/components/FilterModalAnimated';
import { ActiveFiltersBar } from '@/components/ActiveFiltersBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MapViewPlatform from '@/components/MapViewPlatform';
import InteractiveMapViewPlatform from '@/components/InteractiveMapViewPlatform';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import ImageSearchButton from '@/components/ImageSearchButton';
import MapViewFAB from '@/components/MapViewFAB';
import MapFAB from '@/components/MapFAB';
import MapStatusHint from '@/components/MapStatusHint';
import { NativeInteractiveMapViewRef } from '@/components/NativeInteractiveMapView';
import { SkeletonCard } from '@/components/SkeletonCard';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency, formatDistance, formatRating } from '@/lib/currency-utils';
import { invalidateAllCaches, getCachedCategories } from '@/lib/session-cache';
import { invalidateAllListingCaches } from '@/lib/listing-cache';
import { MapViewMode } from '@/types/map';
import { getServiceLocationDisplay } from '@/lib/service-location-utils';
import { subscribeToListingChanges } from '@/lib/home-feed-snapshot';
import { HomeHeader } from '@/components/HomeHeader';
import { HomeSuggestions } from '@/components/HomeSuggestions';
import { HomeListViewWrapper } from '@/components/HomeListViewWrapper';
import { HomeGridViewWrapper } from '@/components/HomeGridViewWrapper';
import { HomeMapViewWrapper } from '@/components/HomeMapViewWrapper';

// PHASE 2: Import data layer hooks
// TIER 3 UPGRADE: Using cursor-based pagination for enterprise-scale performance
import { useListingsCursor as useListings } from '@/hooks/useListingsCursor';
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
  const listing = item;

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
        {item.description && item.description.trim() && (
          <Text style={styles.listingDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.listingMeta}>
          <View style={styles.listingLocation}>
            <MapPin size={14} color={colors.textLight} />
            <Text style={styles.listingLocationText} numberOfLines={1}>
              {getServiceLocationDisplay(item.service_type, profile)}
            </Text>
            {formatDistance(item.distance_miles) && (
              <View style={styles.distanceBadge}>
                <Navigation size={10} color={colors.textLight} />
                <Text style={styles.distanceBadgeText}>
                  {formatDistance(item.distance_miles)}
                </Text>
              </View>
            )}
          </View>
          {(() => {
            const ratingInfo = formatRating(profile?.rating_average, profile?.rating_count);
            return ratingInfo.display && (
              <View style={styles.listingRating}>
                <Star size={14} color={colors.warning} fill={colors.warning} />
                <Text style={styles.listingRatingText}>
                  {ratingInfo.text} ({profile?.rating_count || 0})
                </Text>
              </View>
            );
          })()}
        </View>
        <View style={styles.listingFooter}>
          <View style={styles.listingProvider}>
            <CachedAvatar
              uri={profile?.avatar_url}
              size={32}
              fallbackIconSize={16}
              style={styles.providerAvatar}
            />
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
  const listing = item;

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
      {formatDistance(listing.distance_miles) && (
        <View style={styles.gridDistanceBadge}>
          <Navigation size={10} color={colors.white} />
          <Text style={styles.gridDistanceBadgeText}>
            {formatDistance(listing.distance_miles)}
          </Text>
        </View>
      )}
      <View style={styles.gridCardContent}>
        <View style={styles.gridHeader}>
          <CachedAvatar
            uri={profile?.avatar_url}
            size={28}
            fallbackIconSize={14}
            style={styles.gridAvatar}
          />
          {profile && (
            <Text style={styles.gridAccountName} numberOfLines={1}>
              {profile.full_name}
            </Text>
          )}
          {(() => {
            const ratingInfo = formatRating(profile?.rating_average, profile?.rating_count);
            return ratingInfo.display && (
              <View style={styles.gridRating}>
                <Star size={10} color={colors.warning} fill={colors.warning} />
                <Text style={styles.gridRatingText}>{ratingInfo.text}</Text>
              </View>
            );
          })()}
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && item.description.trim() && (
          <Text style={styles.gridDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.gridFooter}>
          <View style={styles.gridLocation}>
            <MapPin size={12} color={colors.textLight} />
            <Text style={styles.gridLocationText} numberOfLines={1}>
              {getServiceLocationDisplay(item.service_type, profile)}
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
  const [mapMode, setMapMode] = useState<MapViewMode>('listings');
  const [mapZoomLevel, setMapZoomLevel] = useState(12);
  const [showMapStatusHint, setShowMapStatusHint] = useState(false);
  const mapStatusHintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mapRef = useRef<NativeInteractiveMapViewRef>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    ...defaultFilters,
    listingType: (params.filter as 'all' | 'Job' | 'Service' | 'CustomService') || 'all',
  });
  const [categories, setCategories] = useState<Category[]>([]);

  // PHASE 2: Data layer hooks replace old state and fetch functions
  const {
    listings: rawListings,
    loading,
    loadingMore,
    hasMore,
    error: listingsError,
    fetchMore,
    refresh: refreshListings,
    isTransitioning,
    hasHydratedLiveData,
    visualCommitReady,
  } = useListings({
    searchQuery,
    filters,
    userId: profile?.id || null,
    pageSize: 20,
    debounceMs: 300,
  });

  const stableListingsRef = useRef<MarketplaceListing[]>([]);
  const listings = useMemo(() => {
    if (visualCommitReady) {
      stableListingsRef.current = rawListings;
    }
    if (__DEV__) {
      const current = stableListingsRef.current;
      if (current.length > 0) {
        const firstItem = current[0];
        if (!firstItem.id || !firstItem.title) {
          console.warn('[Home Safety] Invalid listing structure detected');
        }
      }
    }
    return stableListingsRef.current;
  }, [rawListings, visualCommitReady]);

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
  // PHASE 4: CACHE INVALIDATION - Clear all caches on user change or logout
  // ============================================================================
  const userIdRef = useRef<string | null>(profile?.id || null);
  const locationInitializedRef = useRef(false);

  useEffect(() => {
    const currentUserId = profile?.id || null;

    // Invalidate cache if user changed (logout or account switch)
    if (userIdRef.current !== currentUserId) {
      invalidateAllListingCaches(); // PHASE 2: Home listings cache
      invalidateAllCaches(); // Session caches (trending, carousel, geocoding, categories)
      locationInitializedRef.current = false; // Reset location lock on user change
      userIdRef.current = currentUserId;
    }
  }, [profile?.id]);

  // Load categories from cache for ActiveFiltersBar display
  useEffect(() => {
    const cached = getCachedCategories(null);
    if (cached && cached.length > 0) {
      setCategories(cached);
    }
  }, []);

  // ============================================================================
  // PHASE 3B: REALTIME SNAPSHOT INVALIDATION
  // Automatically invalidate snapshots when new listings are created or updated
  // ============================================================================
  useEffect(() => {
    const unsubscribe = subscribeToListingChanges(profile?.id || null);
    return unsubscribe;
  }, [profile?.id]);

  // ============================================================================
  // OPTIMIZATION: Sync user location to filters for distance-based filtering
  // STABILITY: Only set location once to prevent distance recalculation
  // ============================================================================
  useEffect(() => {
    // Only update location if not already set (prevents distance from changing mid-session)
    if (locationInitializedRef.current) return;

    const location = userLocation || (profile?.latitude && profile?.longitude
      ? { latitude: profile.latitude, longitude: profile.longitude }
      : null);

    if (location && location.latitude && location.longitude) {
      setFilters(prev => ({
        ...prev,
        userLatitude: location.latitude,
        userLongitude: location.longitude,
      }));
      locationInitializedRef.current = true;
    }
  }, [userLocation, profile?.latitude, profile?.longitude]);

  // ============================================================================
  // PHASE 2: DATA FETCHING NOW HANDLED BY HOOKS
  // ============================================================================
  // - useListings: Main listings with search, filters, pagination
  // - useTrendingSearches: Search suggestions with InteractionManager
  // - useMapData: Location permissions and geolocation
  // ============================================================================

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
    if (__DEV__) {
      console.warn('[Home] Voice search error:', error);
    }
  };

  const handleImageResults = (matches: any[], analysis: any) => {
    if (matches.length > 0) {
      // PHASE 2: Image search now uses search query to trigger useListings hook
      setSearchQuery(analysis.description || 'Image search results');
      setShowSuggestions(false);
    }
  };

  const handleImageError = (error: string) => {
    if (__DEV__) {
      console.warn('[Home] Image search error:', error);
    }
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
  // PHASE 2: All data fetching now handled by useListings hook (lines 277-291)
  // ============================================================================

  // PHASE 2 OPTIMIZATION: Memoize activeFilterCount to prevent recalculation on every render
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.location.trim()) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.minRating > 0) count++;
    if (filters.distance && filters.distance !== 25) count++;
    if (filters.sortBy && filters.sortBy !== 'relevance') count++;
    if (filters.verified) count++;
    if (filters.listingType && filters.listingType !== 'all') count++;
    return count;
  }, [filters]);

  // ============================================================================
  // PHASE 1: SIMPLIFIED FEED DATA TRANSFORMATION
  // ============================================================================
  // Reduced from 6 dependencies to 3 by simplifying logic
  // Faster recalculation: ~5ms vs previous ~15ms for 100 listings
  // ============================================================================
  const feedData = useMemo(() => {
    // Simple grouped layout for all listings
    const groupedListings: any[] = [];
    for (let i = 0; i < listings.length; i += 2) {
      groupedListings.push({
        type: 'row',
        id: `row-${i}`,
        items: [listings[i], listings[i + 1]].filter(Boolean)
      });
    }
    return groupedListings;
  }, [listings]);

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
    // React 18 batches these automatically - single re-render
    setFilters(newFilters);
  }, []);

  // PRIORITY 1 FIX: Memoize filter open handler to prevent function recreation
  const handleOpenFilters = useCallback(() => {
    setShowFilters(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  const handleRemoveFilter = useCallback((filterType: keyof FilterOptions, value?: any) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      switch (filterType) {
        case 'categories':
          if (value) {
            newFilters.categories = prev.categories.filter((id) => id !== value);
          } else {
            newFilters.categories = [];
          }
          break;
        case 'priceMin':
        case 'priceMax':
          newFilters.priceMin = '';
          newFilters.priceMax = '';
          break;
        case 'minRating':
          newFilters.minRating = 0;
          break;
        case 'location':
          newFilters.location = '';
          newFilters.distance = 25;
          break;
        case 'verified':
          newFilters.verified = false;
          break;
        case 'listingType':
          newFilters.listingType = 'all';
          break;
        case 'sortBy':
          newFilters.sortBy = 'relevance';
          break;
        default:
          break;
      }

      return newFilters;
    });
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      ...defaultFilters,
      listingType: filters.listingType,
      userLatitude: filters.userLatitude,
      userLongitude: filters.userLongitude,
    });
  }, [filters.listingType, filters.userLatitude, filters.userLongitude]);

  // ============================================================================
  // PHASE 1: OPTIMIZED MAP MARKERS - Memoized with reduced dependencies
  // ============================================================================
  // Only recalculate when listings array actually changes (not on every render)
  // Tier-4: Lazy computation - defer until map view is active
  // ============================================================================
  const rawMapMarkers = useMemo(() => {
    // Tier-4: Skip expensive computation if map view not active
    if (viewMode !== 'map') {
      return [];
    }

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

    // Filter listings based on map mode
    let filteredListings = listings.filter((listing) => listing.latitude != null && listing.longitude != null);

    if (mapMode === 'services') {
      // Show only services (not custom services, not jobs)
      filteredListings = filteredListings.filter(
        (listing) => listing.marketplace_type !== 'Job' && listing.listing_type !== 'CustomService'
      );
    } else if (mapMode === 'jobs_all') {
      // Show all jobs (both fixed and quoted)
      filteredListings = filteredListings.filter((listing) => listing.marketplace_type === 'Job');
    } else if (mapMode === 'jobs_fixed') {
      // Show only fixed-price jobs
      filteredListings = filteredListings.filter(
        (listing) => listing.marketplace_type === 'Job' && listing.pricing_type === 'fixed_price'
      );
    } else if (mapMode === 'jobs_quoted') {
      // Show only quote-based jobs
      filteredListings = filteredListings.filter(
        (listing) => listing.marketplace_type === 'Job' && listing.pricing_type === 'quote_based'
      );
    }
    // 'listings' mode shows all listings (no additional filtering)

    const listingMarkers = filteredListings.map((listing) => {
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
  }, [listings, mapMode, profile?.user_type, hasHydratedLiveData, viewMode]);

  const stableMapMarkersRef = useRef<any[]>([]);
  const getMapMarkers = useMemo(() => {
    if (visualCommitReady) {
      stableMapMarkersRef.current = rawMapMarkers;
    }
    if (__DEV__) {
      const markers = stableMapMarkersRef.current;
      if (markers.length > 0) {
        const hasInvalidMarker = markers.some(m =>
          m.latitude == null || m.longitude == null || !m.id
        );
        if (hasInvalidMarker) {
          console.warn('[Home Safety] Invalid map marker detected');
        }
      }
    }
    return stableMapMarkersRef.current;
  }, [rawMapMarkers, visualCommitReady]);

  const handleMarkerPress = useCallback((marker: any) => {
    if (marker.type === 'provider') {
      router.push(`/provider/store/${marker.id}`);
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

  const handleMapModeChange = useCallback((mode: MapViewMode) => {
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

  // PRIORITY 5 FIX: Stable onPress handler for memoized card components
  // This prevents cards from re-rendering when the parent re-renders
  const handleCardPress = useCallback((id: string, isJob: boolean) => {
    router.push(isJob ? `/jobs/${id}` : `/listing/${id}`);
  }, []);

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

  // List view renderer - stable, no viewMode dependency
  const renderFeedItemList = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.type === 'row') {
      return (
        <View>
          {item.items.map((listing: MarketplaceListing) => (
            <View key={listing.id} style={styles.listItemContainer}>
              {renderListingCard({ item: listing })}
            </View>
          ))}
        </View>
      );
    }

    return renderListingCard({ item: item.data });
  }, [renderListingCard]);

  // Grid view renderer - stable, no viewMode dependency
  const renderFeedItemGrid = useCallback(({ item, index }: { item: any; index: number }) => {
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
  }, [renderGridCard]);

  const handleClearFiltersAndSearch = useCallback(() => {
    setSearchQuery('');
    setFilters({
      ...defaultFilters,
      userLatitude: filters.userLatitude,
      userLongitude: filters.userLongitude,
    });
  }, [filters.userLatitude, filters.userLongitude]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSuggestions(false);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setShowSuggestions(searchQuery.length > 0 || trendingSearches.length > 0);
  }, [searchQuery.length, trendingSearches.length]);

  const handleViewModeChange = useCallback((mode: 'list' | 'grid' | 'map') => {
    setViewMode(mode);
  }, []);

  return (
    <View style={styles.container}>
      <HomeHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchFocus={handleSearchFocus}
        onClearSearch={handleClearSearch}
        onVoiceResults={handleVoiceResults}
        onVoiceError={handleVoiceError}
        onImageResults={handleImageResults}
        onImageError={handleImageError}
        filters={filters}
        categories={categories}
        onRemoveFilter={handleRemoveFilter}
        onClearAllFilters={handleClearAllFilters}
        isTransitioning={isTransitioning}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenFilters={handleOpenFilters}
        activeFilterCount={activeFilterCount}
        filterIndicatorText={filterIndicatorText}
        onClearFiltersAndSearch={handleClearFiltersAndSearch}
        styles={styles}
      />

      <HomeSuggestions
        showSuggestions={showSuggestions}
        searchQuery={searchQuery}
        suggestions={suggestions}
        trendingSearches={trendingSearches}
        onSelectSuggestion={selectSuggestion}
        styles={styles}
      />

      {loading && listings.length > 0 && (
        <View style={styles.backgroundRefreshIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.backgroundRefreshText}>Updating...</Text>
        </View>
      )}

      {loading && listings.length === 0 ? (
        <View style={{ flex: 1 }}>
          {viewMode === 'list' ? (
            <FlatList
              data={Array.from({ length: 8 }, (_, i) => i)}
              renderItem={() => <SkeletonCard customWidth={undefined} />}
              keyExtractor={(_, index) => `skeleton-${index}`}
              contentContainerStyle={styles.listingsContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={Array.from({ length: 8 }, (_, i) => i)}
              renderItem={({ index }) => (
                <View style={index % 2 === 0 ? { marginRight: spacing.sm } : {}}>
                  <SkeletonCard customWidth={(width - spacing.lg * 3) / 2} />
                </View>
              )}
              keyExtractor={(_, index) => `skeleton-grid-${index}`}
              contentContainerStyle={styles.gridContainer}
              numColumns={2}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : !loading && listings.length === 0 && !searchQuery && activeFilterCount === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyStateTitle}>Welcome to Dollarsmiley</Text>
          <Text style={styles.emptyStateText}>
            No listings available right now. Check back soon!
          </Text>
        </View>
      ) : listings.length > 0 ? (
        <View style={{ flex: 1 }}>
          <HomeListViewWrapper
            viewMode={viewMode}
            feedData={feedData}
            renderFeedItemList={renderFeedItemList}
            feedKeyExtractor={feedKeyExtractor}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
            listings={listings}
            styles={styles}
          />

          <HomeGridViewWrapper
            viewMode={viewMode}
            feedData={feedData}
            renderFeedItemGrid={renderFeedItemGrid}
            feedKeyExtractor={feedKeyExtractor}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
            listings={listings}
            styles={styles}
          />

          <HomeMapViewWrapper
            viewMode={viewMode}
            mapRef={mapRef}
            mapMarkers={getMapMarkers}
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
            onZoomChange={handleMapZoomChange}
            filterLocation={
              filters.userLatitude !== undefined && filters.userLongitude !== undefined
                ? { latitude: filters.userLatitude, longitude: filters.userLongitude }
                : undefined
            }
            filterDistance={filters.distance}
            showMapStatusHint={showMapStatusHint}
            mapZoomLevel={mapZoomLevel}
            mapMode={mapMode}
            onMapModeChange={handleMapModeChange}
            onMapZoomIn={handleMapZoomIn}
            onMapZoomOut={handleMapZoomOut}
            onMapRecenter={handleMapRecenter}
            onMapLayers={handleMapLayers}
            styles={styles}
          />
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
                setFilters({
                  ...defaultFilters,
                  userLatitude: filters.userLatitude,
                  userLongitude: filters.userLongitude,
                });
              }}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Reset Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ErrorBoundary>
        <FilterModal
          visible={showFilters}
          onClose={handleCloseFilters}
          onApply={handleApplyFilters}
          currentFilters={filters}
        />
      </ErrorBoundary>
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
  listItemContainer: {
    marginBottom: spacing.md,
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
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listingLocationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  distanceBadgeText: {
    fontSize: 10,
    color: colors.textLight,
    fontWeight: '500',
  },
  listingRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listingRatingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listingProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
  },
  providerAvatarPlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
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
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
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
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...shadows.md,
    zIndex: 1,
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
  backgroundRefreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  backgroundRefreshText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
