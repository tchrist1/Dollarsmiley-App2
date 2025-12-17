import { supabase } from './supabase';
import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData extends Coordinates {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface ProviderLocation {
  id: string;
  provider_id: string;
  location_type: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  service_radius_miles: number;
  is_active: boolean;
  is_primary: boolean;
  metadata?: any;
}

export interface ServiceArea {
  id: string;
  provider_id: string;
  area_name: string;
  area_type: 'radius' | 'polygon' | 'multi_point';
  center_lat?: number;
  center_lng?: number;
  radius_miles?: number;
  cities_covered?: string[];
  zip_codes_covered?: string[];
  is_active: boolean;
}

export interface NearbyProvider {
  provider_id: string;
  full_name: string;
  avatar_url?: string;
  location_city: string;
  location_state: string;
  distance_miles: number;
  service_radius_miles: number;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
}

export interface NearbyListing {
  listing_id: string;
  title: string;
  description: string;
  price: number;
  provider_id: string;
  provider_name: string;
  location_city: string;
  distance_miles: number;
  rating: number;
  total_reviews: number;
  image_urls: string[];
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      maximumAge: 30000,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationData | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (results.length === 0) {
      return null;
    }

    const location = results[0];
    return {
      latitude,
      longitude,
      address: [location.streetNumber, location.street].filter(Boolean).join(' '),
      city: location.city || undefined,
      state: location.region || undefined,
      country: location.country || 'US',
      postalCode: location.postalCode || undefined,
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const results = await Location.geocodeAsync(address);

    if (results.length === 0) {
      return null;
    }

    return {
      latitude: results[0].latitude,
      longitude: results[0].longitude,
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusMiles = 3959;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function searchProvidersNearby(params: {
  latitude: number;
  longitude: number;
  radius?: number;
  categoryId?: string;
  limit?: number;
}): Promise<NearbyProvider[]> {
  try {
    const { data, error } = await supabase.rpc('search_providers_nearby', {
      search_lat: params.latitude,
      search_lng: params.longitude,
      radius_miles: params.radius || 25,
      category_filter: params.categoryId || null,
      limit_results: params.limit || 50,
    });

    if (error) throw error;

    await trackLocationSearch({
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 25,
      categoryId: params.categoryId,
      resultsCount: data?.length || 0,
    });

    return data || [];
  } catch (error) {
    console.error('Error searching providers nearby:', error);
    throw error;
  }
}

export async function searchListingsNearby(params: {
  latitude: number;
  longitude: number;
  radius?: number;
  categoryId?: string;
  minRating?: number;
  maxPrice?: number;
  limit?: number;
}): Promise<NearbyListing[]> {
  try {
    const { data, error } = await supabase.rpc('search_listings_nearby', {
      search_lat: params.latitude,
      search_lng: params.longitude,
      radius_miles: params.radius || 25,
      category_filter: params.categoryId || null,
      min_rating: params.minRating || null,
      max_price: params.maxPrice || null,
      limit_results: params.limit || 50,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching listings nearby:', error);
    throw error;
  }
}

export async function getProvidersServingLocation(params: {
  latitude: number;
  longitude: number;
  categoryId?: string;
}): Promise<NearbyProvider[]> {
  try {
    const { data, error } = await supabase.rpc('get_providers_serving_location', {
      check_lat: params.latitude,
      check_lng: params.longitude,
      category_filter: params.categoryId || null,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting providers serving location:', error);
    throw error;
  }
}

export async function updateProfileLocation(params: {
  userId: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  serviceRadius?: number;
  enabled?: boolean;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        location_lat: params.latitude,
        location_lng: params.longitude,
        location_address: params.address,
        location_city: params.city,
        location_state: params.state,
        location_country: params.country || 'US',
        location_postal_code: params.postalCode,
        service_radius_miles: params.serviceRadius || 25,
        location_enabled: params.enabled !== undefined ? params.enabled : true,
        location_updated_at: new Date().toISOString(),
      })
      .eq('id', params.userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating profile location:', error);
    throw error;
  }
}

export async function createProviderLocation(
  location: Omit<ProviderLocation, 'id'>
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('provider_locations')
      .insert({
        provider_id: location.provider_id,
        location_type: location.location_type,
        location_name: location.location_name,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        postal_code: location.postal_code,
        service_radius_miles: location.service_radius_miles,
        is_active: location.is_active,
        is_primary: location.is_primary,
        metadata: location.metadata,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating provider location:', error);
    throw error;
  }
}

export async function getProviderLocations(
  providerId: string
): Promise<ProviderLocation[]> {
  try {
    const { data, error } = await supabase
      .from('provider_locations')
      .select('*')
      .eq('provider_id', providerId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting provider locations:', error);
    throw error;
  }
}

export async function createServiceArea(
  area: Omit<ServiceArea, 'id'>
): Promise<string> {
  try {
    const { data, error} = await supabase
      .from('service_areas')
      .insert({
        provider_id: area.provider_id,
        area_name: area.area_name,
        area_type: area.area_type,
        center_lat: area.center_lat,
        center_lng: area.center_lng,
        radius_miles: area.radius_miles,
        cities_covered: area.cities_covered,
        zip_codes_covered: area.zip_codes_covered,
        is_active: area.is_active,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating service area:', error);
    throw error;
  }
}

async function trackLocationSearch(params: {
  latitude: number;
  longitude: number;
  radius: number;
  categoryId?: string;
  resultsCount: number;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('location_searches').insert({
      user_id: user?.id || null,
      search_lat: params.latitude,
      search_lng: params.longitude,
      radius_miles: params.radius,
      category_id: params.categoryId,
      results_count: params.resultsCount,
    });
  } catch (error) {
    console.error('Error tracking location search:', error);
  }
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return 'Less than 0.1 mi';
  } else if (miles < 1) {
    return `${miles.toFixed(1)} mi`;
  } else {
    return `${Math.round(miles)} mi`;
  }
}

export function formatLocation(city?: string, state?: string): string {
  if (city && state) {
    return `${city}, ${state}`;
  } else if (city) {
    return city;
  } else if (state) {
    return state;
  }
  return 'Location not set';
}
