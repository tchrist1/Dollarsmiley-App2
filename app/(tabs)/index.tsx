import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, MapPin, DollarSign, Star, SlidersHorizontal, TrendingUp, Clock, X, Navigation, List, LayoutGrid, User, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ServiceListing, MarketplaceListing, Job } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDistance, geocodeAddress } from '@/lib/geolocation';
import { FilterModal } from '@/components/FilterModal';
import MapViewPlatform from '@/components/MapViewPlatform';
import InteractiveMapViewPlatform from '@/components/InteractiveMapViewPlatform';
import { RecommendationsCarousel } from '@/components/RecommendationsCarousel';
import FeaturedListingsSection from '@/components/FeaturedListingsSection';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import ImageSearchButton from '@/components/ImageSearchButton';
import AdminBanner from '@/components/AdminBanner';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';

interface FilterOptions {
  categories: string[];
  location: string;
  priceMin: string;
  priceMax: string;
  minRating: number;
  distance?: number;
  availability?: 'any' | 'today' | 'this_week' | 'this_month';
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popular' | 'recent' | 'distance';
  verified?: boolean;
  instant_booking?: boolean;
  listingType?: 'all' | 'Job' | 'Service' | 'CustomService';
}

interface SearchSuggestion {
  suggestion: string;
  search_count: number;
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState<SearchSuggestion[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('grid');
  const [mapMode, setMapMode] = useState<'listings' | 'providers'>('listings');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLoadingMoreRef = useRef(false);

  // Carousel sections
  const [recommendedListings, setRecommendedListings] = useState<MarketplaceListing[]>([]);
  const [trendingListings, setTrendingListings] = useState<MarketplaceListing[]>([]);
  const [popularListings, setPopularListings] = useState<MarketplaceListing[]>([]);
  const [carouselsLoading, setCarouselsLoading] = useState(true);
  const [feedData, setFeedData] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    location: '',
    priceMin: '',
    priceMax: '',
    minRating: 0,
    distance: 25,
    availability: 'any',
    sortBy: 'relevance',
    verified: false,
    instant_booking: false,
    listingType: (params.filter as 'all' | 'Job' | 'Service' | 'CustomService') || 'all',
  });

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchTrendingSearches();
    requestLocationPermission();
    fetchCarouselSections();
  }, [profile]);

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
    if (params.categoryId) {
      setFilters(prev => ({
        ...prev,
        categories: [params.categoryId as string],
      }));

      // Update search query with category name if provided
      if (params.categoryName) {
        setSearchQuery(params.categoryName as string);
      }
    }
  }, [params.categoryId, params.categoryName]);

  // Handle search parameter from navigation
  useEffect(() => {
    if (params.search) {
      setSearchQuery(params.search as string);
    }
  }, [params.search]);

  const requestLocationPermission = async () => {
    try {
      if (profile?.latitude && profile?.longitude) {
        setUserLocation({
          latitude: profile.latitude,
          longitude: profile.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      setPage(0);
      setHasMore(true);
      fetchListings(true);
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [filters, searchQuery]);

  const fetchTrendingSearches = async () => {
    const { data } = await supabase
      .from('popular_searches')
      .select('search_term, search_count')
      .order('search_count', { ascending: false })
      .limit(5);

    if (data) {
      setTrendingSearches(data.map(d => ({ suggestion: d.search_term, search_count: d.search_count })));
    }
  };

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
      setListings(results);
      setSearchQuery(query);
      setShowSuggestions(false);
    }
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice search error:', error);
  };

  const handleImageResults = (matches: any[], analysis: any) => {
    if (matches.length > 0) {
      // Convert image search matches to listing format
      const matchIds = matches.map(m => m.id);

      // Fetch full listing details
      supabase
        .from('profiles')
        .select('*, category:categories(*)')
        .in('id', matchIds)
        .then(({ data }) => {
          if (data) {
            setListings(data as any);
            setSearchQuery(analysis.description || 'Image search results');
          }
        });
    }
  };

  const handleImageError = (error: string) => {
    console.error('Image search error:', error);
  };

  const fetchCarouselSections = async () => {
    setCarouselsLoading(true);
    try {
      const { data: serviceData } = await supabase
        .from('service_listings')
        .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)')
        .eq('status', 'Active')
        .order('view_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(15);

      const { data: jobData } = await supabase
        .from('jobs')
        .select('*, profiles!jobs_customer_id_fkey(*), categories(*)')
        .eq('status', 'Open')
        .order('created_at', { ascending: false })
        .limit(15);

      const allServices = serviceData ? serviceData.map(normalizeServiceListing) : [];
      const allJobs = jobData ? jobData.map(normalizeJob) : [];
      const allListings = [...allServices, ...allJobs];

      if (allListings.length > 0) {
        const trending = allListings
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 10);
        setTrendingListings(trending);

        const popular = allListings
          .sort((a, b) => {
            const aProfile = a.provider || a.customer;
            const bProfile = b.provider || b.customer;
            const aRating = aProfile?.rating_average || 0;
            const bRating = bProfile?.rating_average || 0;

            if (aRating > 0 && bRating > 0) {
              const ratingDiff = bRating - aRating;
              if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
              return (bProfile?.rating_count || 0) - (aProfile?.rating_count || 0);
            }

            if (aRating > 0) return -1;
            if (bRating > 0) return 1;

            return (b.view_count || 0) - (a.view_count || 0);
          })
          .slice(0, 10);
        setPopularListings(popular);

        const recommended = allListings
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        setRecommendedListings(recommended);
      }
    } catch (error) {
      console.error('Error fetching carousel sections:', error);
    } finally {
      setCarouselsLoading(false);
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

  const normalizeServiceListing = (service: any): MarketplaceListing => {
    let photos = [];
    if (service.photos) {
      if (Array.isArray(service.photos)) {
        photos = service.photos;
      } else if (typeof service.photos === 'string') {
        try {
          const parsed = JSON.parse(service.photos);
          photos = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          photos = [];
        }
      }
    }

    const featuredImage = service.featured_image_url || (photos.length > 0 ? photos[0] : 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg');

    const latitude = service.latitude ? (typeof service.latitude === 'string' ? parseFloat(service.latitude) : service.latitude) : null;
    const longitude = service.longitude ? (typeof service.longitude === 'string' ? parseFloat(service.longitude) : service.longitude) : null;

    return {
      id: service.id,
      marketplace_type: service.listing_type || 'Service',
      title: service.title,
      description: service.description,
      category_id: service.category_id,
      location: service.location || '',
      latitude,
      longitude,
      photos,
      featured_image_url: featuredImage,
      created_at: service.created_at,
      base_price: service.base_price,
      pricing_type: service.pricing_type,
      provider_id: service.provider_id,
      status: service.status,
      listing_type: service.listing_type,
      provider: service.profiles,
      category: service.categories,
      distance_miles: service.distance_miles,
      view_count: service.view_count,
    };
  };

  const normalizeJob = (job: any): MarketplaceListing => {
    let photos = [];
    if (job.photos) {
      if (Array.isArray(job.photos)) {
        photos = job.photos;
      } else if (typeof job.photos === 'string') {
        try {
          const parsed = JSON.parse(job.photos);
          photos = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          photos = [];
        }
      }
    }

    const featuredImage = job.featured_image_url || (photos.length > 0 ? photos[0] : 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg');

    const latitude = job.latitude ? (typeof job.latitude === 'string' ? parseFloat(job.latitude) : job.latitude) : null;
    const longitude = job.longitude ? (typeof job.longitude === 'string' ? parseFloat(job.longitude) : job.longitude) : null;

    return {
      id: job.id,
      marketplace_type: 'Job',
      title: job.title,
      description: job.description,
      category_id: job.category_id,
      location: job.location,
      latitude,
      longitude,
      photos,
      featured_image_url: featuredImage,
      created_at: job.created_at,
      budget_min: job.budget_min,
      budget_max: job.budget_max,
      fixed_price: job.fixed_price,
      pricing_type: job.pricing_type,
      customer_id: job.customer_id,
      status: job.status,
      execution_date_start: job.execution_date_start,
      execution_date_end: job.execution_date_end,
      preferred_time: job.preferred_time,
      customer: job.profiles,
      category: job.categories,
      distance_miles: job.distance_miles,
      view_count: 0,
    };
  };

  const fetchListings = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setListings([]);
      isLoadingMoreRef.current = false;
    } else {
      if (!hasMore || loadingMore || isLoadingMoreRef.current) return;
      setLoadingMore(true);
      isLoadingMoreRef.current = true;
    }

    const currentPage = reset ? 0 : page;
    const offset = currentPage * PAGE_SIZE;

    try {
      let allResults: MarketplaceListing[] = [];

      const shouldFetchServices = !filters.listingType || filters.listingType === 'all' || filters.listingType === 'Service' || filters.listingType === 'CustomService';
      const shouldFetchJobs = !filters.listingType || filters.listingType === 'all' || filters.listingType === 'Job';

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

        const { data: serviceData, error: serviceError } = await serviceQuery;

        if (!serviceError && serviceData) {
          const normalizedServices = serviceData.map(normalizeServiceListing);
          allResults = [...allResults, ...normalizedServices];
        }
      }

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

        if (filters.priceMin) {
          jobQuery = jobQuery.or(`budget_min.gte.${parseFloat(filters.priceMin)},fixed_price.gte.${parseFloat(filters.priceMin)}`);
        }

        if (filters.priceMax) {
          jobQuery = jobQuery.or(`budget_max.lte.${parseFloat(filters.priceMax)},fixed_price.lte.${parseFloat(filters.priceMax)}`);
        }

        jobQuery = jobQuery.order('created_at', { ascending: false }).limit(PAGE_SIZE * 2);

        const { data: jobData, error: jobError } = await jobQuery;

        if (!jobError && jobData) {
          const normalizedJobs = jobData.map(normalizeJob);
          allResults = [...allResults, ...normalizedJobs];
        }
      }

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
            console.error('Error geocoding location:', error);
          }
        }

        // If we have a reference location, calculate distances and filter
        if (referenceLocation) {
          allResults = allResults
            .map(listing => {
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
            })
            .filter(listing => {
              // Only include listings within the distance radius
              // Keep listings without coordinates (they'll appear at the end)
              if (listing.distance_miles !== undefined) {
                return listing.distance_miles <= filters.distance!;
              }
              return false; // Exclude listings without valid coordinates
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
      } else {
        setListings((prev) => [...prev, ...paginatedData]);
        setPage((prev) => prev + 1);
      }

      setHasMore(paginatedData.length === PAGE_SIZE && allResults.length > offset + PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  };

  const buildFeedData = () => {
    if (searchQuery || activeFilterCount > 0) {
      const groupedListings: any[] = [];
      for (let i = 0; i < listings.length; i += 2) {
        groupedListings.push({
          type: 'row',
          id: `row-${i}`,
          items: [listings[i], listings[i + 1]].filter(Boolean)
        });
      }
      setFeedData(groupedListings);
      return;
    }

    const feed: any[] = [];
    const ITEMS_PER_BLOCK = 6;

    feed.push({ type: 'banner', id: 'admin-banner' });

    if (trendingListings.length > 0) {
      console.log('Adding Trending carousel to feed with', trendingListings.length, 'items');
      feed.push({
        type: 'carousel',
        id: 'trending',
        title: 'Trending This Week',
        icon: 'trending',
        data: trendingListings
      });
    } else {
      console.log('Skipping Trending carousel - no data');
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
      console.log('Adding Popular carousel to feed with', popularListings.length, 'items');
      feed.push({
        type: 'carousel',
        id: 'popular',
        title: 'Popular Services',
        icon: 'star',
        data: popularListings
      });
    } else {
      console.log('Skipping Popular carousel - no data');
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
      console.log('Adding Recommended carousel to feed with', recommendedListings.length, 'items');
      feed.push({
        type: 'carousel',
        id: 'recommended',
        title: 'Recommended for You',
        icon: 'sparkles',
        data: recommendedListings
      });
    } else {
      console.log('Skipping Recommended carousel - no data');
    }

    const remaining = listings.slice(ITEMS_PER_BLOCK * 2);
    for (let i = 0; i < remaining.length; i += 2) {
      feed.push({
        type: 'row',
        id: `row-remaining-${i}`,
        items: [remaining[i], remaining[i + 1]].filter(Boolean)
      });
    }

    console.log('Feed built with', feed.length, 'items. Carousels:', feed.filter(f => f.type === 'carousel').map(f => f.id));
    setFeedData(feed);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.location.trim()) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.minRating > 0) count++;
    if (filters.distance && filters.distance !== 25) count++; // Count if distance is set and not default
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  useEffect(() => {
    buildFeedData();
  }, [listings, trendingListings, popularListings, recommendedListings, searchQuery, activeFilterCount]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading && !isLoadingMoreRef.current) {
      fetchListings(false);
    }
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const getMapMarkers = () => {
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
              )
            ).slice(0, 5);

            providersMap.set(profile.id, {
              id: profile.id,
              latitude: profile.latitude,
              longitude: profile.longitude,
              title: profile.full_name,
              subtitle: (profile as any).business_name || 'Service Provider',
              type: 'provider' as const,
              rating: profile.rating_average,
              isVerified: profile.is_verified,
              reviewCount: profile.rating_count || 0,
              categories: categories,
              responseTime: (profile as any).response_time || 'Within 24 hours',
              completionRate: (profile as any).completion_rate || 95,
            });
          }
        }
      });

      const markers = Array.from(providersMap.values());
      console.log('Provider markers:', markers.length);
      return markers;
    }

    const listingMarkers = listings
      .filter((listing) => {
        const hasCoords = listing.latitude != null && listing.longitude != null;
        if (!hasCoords) {
          console.log('Listing missing coordinates:', listing.id, listing.title);
        }
        return hasCoords;
      })
      .map((listing) => {
        let price = 0;
        let listingType: 'Service' | 'CustomService' | 'Job' = 'Service';

        if (listing.marketplace_type === 'Job') {
          price = listing.fixed_price || listing.budget_min || 0;
          listingType = 'Job';
        } else {
          price = listing.base_price || 0;
          listingType = listing.listing_type === 'CustomService' ? 'CustomService' : 'Service';
        }

        return {
          id: listing.id,
          latitude: listing.latitude!,
          longitude: listing.longitude!,
          title: listing.title,
          price: price,
          type: 'listing' as const,
          listingType: listingType,
        };
      });

    console.log('Listing markers:', listingMarkers.length, 'out of', listings.length, 'total listings');
    console.log('Markers by type:', listingMarkers.reduce((acc: any, m: any) => {
      acc[m.listingType] = (acc[m.listingType] || 0) + 1;
      return acc;
    }, {}));
    return listingMarkers;
  };

  const handleMarkerPress = (marker: any) => {
    if (marker.type === 'provider') {
      router.push(`/reviews/${marker.id}`);
    } else {
      const listing = listings.find((l) => l.id === marker.id);
      if (listing) {
        const isJob = listing.marketplace_type === 'Job';
        router.push(isJob ? `/jobs/${listing.id}` : `/listing/${listing.id}`);
      }
    }
  };

  const renderStars = (rating: number) => {
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
  };

  const renderCarouselSection = (title: string, icon: React.ReactNode, data: MarketplaceListing[], type: string) => {
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
          renderItem={({ item }) => {
            const isJob = item.marketplace_type === 'Job';
            const profile = isJob ? item.customer : item.provider;
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
                    <Text style={styles.carouselCardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {isJob && (
                      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '600' }}>JOB</Text>
                      </View>
                    )}
                  </View>
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
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselList}
        />
      </View>
    );
  };

  const handleSeeAll = (type: string) => {
    if (type === 'recommended') {
      setListings(recommendedListings);
    } else if (type === 'trending') {
      setListings(trendingListings);
    } else if (type === 'popular') {
      setListings(popularListings);
    }
    setPage(0);
    setHasMore(false);
  };

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

  const renderListingCard = ({ item }: { item: MarketplaceListing }) => {
    const isJob = item.marketplace_type === 'Job';
    const profile = isJob ? item.customer : item.provider;
    const listing = item as any;

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
        onPress={() => router.push(isJob ? `/jobs/${item.id}` : `/listing/${item.id}`)}
      >
        <View style={styles.listingContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.listingTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {isJob && (
              <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>JOB</Text>
              </View>
            )}
          </View>
          <Text style={styles.listingDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.listingMeta}>
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.location || 'Remote'}</Text>
            </View>
            {listing.distance_miles !== undefined && (
              <View style={styles.metaItem}>
                <Navigation size={14} color={colors.primary} />
                <Text style={styles.distanceText}>
                  {listing.distance_miles && listing.distance_miles < 1
                    ? `${(listing.distance_miles * 5280).toFixed(0)} ft`
                    : listing.distance_miles ? `${listing.distance_miles.toFixed(1)} mi` : 'N/A'}
                </Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <DollarSign size={14} color={colors.primary} />
              <Text style={styles.priceText}>{priceText}</Text>
            </View>
          </View>
          {profile && (
            <View style={styles.providerInfo}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {profile.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.providerDetails}>
                <Text style={styles.providerName}>{profile.full_name}</Text>
                {profile.rating_average > 0 && (
                  <View style={styles.rating}>
                    <Star size={14} color={colors.warning} fill={colors.warning} />
                    <Text style={styles.ratingText}>
                      {profile.rating_average.toFixed(1)} ({profile.rating_count || 0})
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGridCard = ({ item }: { item: MarketplaceListing }) => {
    const isJob = item.marketplace_type === 'Job';
    const profile = isJob ? item.customer : item.provider;
    const listing = item as any;

    const mainImage = listing.featured_image_url || null;

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
        onPress={() => router.push(isJob ? `/jobs/${item.id}` : `/listing/${item.id}`)}
      >
        {mainImage ? (
          <Image
            source={{ uri: mainImage }}
            style={styles.gridCardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.gridCardImage, styles.gridCardImagePlaceholder]}>
            <Text style={styles.gridCardImagePlaceholderText}>
              {isJob ? '💼' : listing.listing_type === 'CustomService' ? '✨' : '🛠️'}
            </Text>
          </View>
        )}
        {isJob && (
          <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, zIndex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>JOB</Text>
          </View>
        )}
        <View style={styles.gridCardContent}>
          <View style={styles.gridHeader}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.gridAvatar} />
            ) : (
              <View style={[styles.gridAvatar, styles.gridAvatarPlaceholder]}>
                <Text style={styles.gridAvatarText}>
                  {profile?.full_name.charAt(0).toUpperCase() || 'S'}
                </Text>
              </View>
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
              <Text style={styles.gridPriceType}>{priceSuffix}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeedItem = ({ item, index }: { item: any; index: number }) => {
    if (item.type === 'banner') {
      return <AdminBanner autoRotate={true} interval={4500} />;
    }

    if (item.type === 'carousel') {
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
                  <View style={styles.embeddedCarouselCardContent}>
                    <Text style={styles.embeddedCarouselCardTitle} numberOfLines={2}>
                      {carouselItem.title}
                    </Text>
                    <Text style={styles.embeddedCarouselCardProvider} numberOfLines={1}>
                      {carouselListing.profiles?.full_name || carouselListing.provider?.full_name || carouselListing.customer?.full_name || 'Provider'}
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
            keyExtractor={(carouselItem) => carouselItem.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.embeddedCarouselList}
          />
        </View>
      );
    }

    if (item.type === 'row') {
      // For list view, render as individual list cards
      if (viewMode === 'list') {
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
      // For grid view, render as grid row
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

    if (viewMode === 'grid') {
      return renderGridCard({ item: item.data });
    }
    return renderListingCard({ item: item.data });
  };

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
              placeholder="Search for event services, party providers, and local jobs"
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
            onPress={() => setShowFilters(true)}
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
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            </Text>
            <TouchableOpacity
              onPress={() =>
                setFilters({
                  categories: [],
                  location: '',
                  priceMin: '',
                  priceMax: '',
                  minRating: 0,
                  distance: 25,
                  availability: 'any',
                  sortBy: 'relevance',
                  verified: false,
                  instant_booking: false,
                  listingType: 'all',
                })
              }
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
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : listings.length === 0 && !searchQuery && activeFilterCount === 0 ? (
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
      ) : listings.length > 0 ? (
        viewMode === 'list' ? (
          <FlatList
            key="list-view"
            data={feedData}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listingsContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
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
        ) : viewMode === 'grid' ? (
          <FlatList
            key="grid-view"
            data={feedData}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
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
        ) : (
          <View style={styles.mapViewContainer}>
            <InteractiveMapViewPlatform
              markers={getMapMarkers()}
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
              showControls={true}
              onSwitchToList={() => setViewMode('list')}
              showUserLocation={true}
              enableClustering={true}
            />
            <View style={styles.mapModeToggle}>
              <TouchableOpacity
                style={[styles.mapModeButton, mapMode === 'listings' && styles.mapModeButtonActive]}
                onPress={() => setMapMode('listings')}
                activeOpacity={0.7}
              >
                <MapPin
                  size={16}
                  color={mapMode === 'listings' ? colors.white : colors.text}
                />
                <Text
                  style={[
                    styles.mapModeButtonText,
                    mapMode === 'listings' && styles.mapModeButtonTextActive,
                  ]}
                >
                  Listings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapModeButton, mapMode === 'providers' && styles.mapModeButtonActive]}
                onPress={() => setMapMode('providers')}
                activeOpacity={0.7}
              >
                <User size={16} color={mapMode === 'providers' ? colors.white : colors.text} />
                <Text
                  style={[
                    styles.mapModeButtonText,
                    mapMode === 'providers' && styles.mapModeButtonTextActive,
                  ]}
                >
                  Providers
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )
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
                  categories: [],
                  location: '',
                  priceMin: '',
                  priceMax: '',
                  minRating: 0,
                  distance: 25,
                  availability: 'any',
                  sortBy: 'relevance',
                  verified: false,
                  instant_booking: false,
                  listingType: 'all',
                });
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
        onClose={() => setShowFilters(false)}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gridAvatar: {
    width: 32,
    height: 32,
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
  mapModeToggle: {
    position: 'absolute',
    top: spacing.xxl + spacing.md,
    left: '50%',
    transform: [{ translateX: -100 }],
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    ...shadows.lg,
  },
  mapModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  mapModeButtonActive: {
    backgroundColor: colors.primary,
  },
  mapModeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  mapModeButtonTextActive: {
    color: colors.white,
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
    padding: spacing.md,
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
    marginBottom: spacing.sm,
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
});
