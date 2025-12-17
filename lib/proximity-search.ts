import { supabase } from './supabase';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get bounding box coordinates for a given center point and radius
 */
export function getBoundingBox(
  centerLat: number,
  centerLon: number,
  radiusMiles: number
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  const latDegreePerMile = 1 / 69.0;
  const lonDegreePerMile = 1 / (69.0 * Math.cos(toRad(centerLat)));

  return {
    minLat: centerLat - radiusMiles * latDegreePerMile,
    maxLat: centerLat + radiusMiles * latDegreePerMile,
    minLon: centerLon - radiusMiles * lonDegreePerMile,
    maxLon: centerLon + radiusMiles * lonDegreePerMile,
  };
}

interface ProximitySearchOptions {
  userLatitude: number;
  userLongitude: number;
  radiusMiles?: number;
  categoryId?: string;
  subcategoryId?: string;
  includeDemoListings?: boolean;
  limit?: number;
  offset?: number;
}

interface ServiceListing {
  id: string;
  title: string;
  description: string;
  base_price: number;
  latitude: number;
  longitude: number;
  location: string;
  distance?: number;
  is_demo: boolean;
  photos: any[];
  provider_id: string;
  category_id: string;
  status: string;
}

interface JobListing {
  id: string;
  title: string;
  description: string;
  budget_min: number;
  budget_max: number;
  latitude: number;
  longitude: number;
  location: string;
  distance?: number;
  is_demo: boolean;
  photos: any[];
  customer_id: string;
  category_id: string;
  status: string;
}

/**
 * Search for service listings within proximity
 */
export async function searchNearbyServices(
  options: ProximitySearchOptions
): Promise<{ data: ServiceListing[]; error: any }> {
  const {
    userLatitude,
    userLongitude,
    radiusMiles = 5,
    categoryId,
    subcategoryId,
    includeDemoListings = true,
    limit = 20,
    offset = 0,
  } = options;

  const bbox = getBoundingBox(userLatitude, userLongitude, radiusMiles);

  try {
    let query = supabase
      .from('service_listings')
      .select('*')
      .eq('status', 'Active')
      .gte('latitude', bbox.minLat)
      .lte('latitude', bbox.maxLat)
      .gte('longitude', bbox.minLon)
      .lte('longitude', bbox.maxLon);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (subcategoryId) {
      query = query.eq('category_id', subcategoryId);
    }

    if (!includeDemoListings) {
      query = query.eq('is_demo', false);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return { data: [], error };
    }

    // Calculate exact distances and filter by radius
    const listingsWithDistance = (data || [])
      .map((listing) => ({
        ...listing,
        distance: calculateDistance(
          userLatitude,
          userLongitude,
          listing.latitude,
          listing.longitude
        ),
      }))
      .filter((listing) => listing.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);

    return { data: listingsWithDistance, error: null };
  } catch (error) {
    console.error('Error searching nearby services:', error);
    return { data: [], error };
  }
}

/**
 * Search for job listings within proximity
 */
export async function searchNearbyJobs(
  options: ProximitySearchOptions
): Promise<{ data: JobListing[]; error: any }> {
  const {
    userLatitude,
    userLongitude,
    radiusMiles = 5,
    categoryId,
    subcategoryId,
    includeDemoListings = true,
    limit = 20,
    offset = 0,
  } = options;

  const bbox = getBoundingBox(userLatitude, userLongitude, radiusMiles);

  try {
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', 'Open')
      .gte('latitude', bbox.minLat)
      .lte('latitude', bbox.maxLat)
      .gte('longitude', bbox.minLon)
      .lte('longitude', bbox.maxLon);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (subcategoryId) {
      query = query.eq('category_id', subcategoryId);
    }

    if (!includeDemoListings) {
      query = query.eq('is_demo', false);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return { data: [], error };
    }

    // Calculate exact distances and filter by radius
    const jobsWithDistance = (data || [])
      .map((job) => ({
        ...job,
        distance: calculateDistance(userLatitude, userLongitude, job.latitude, job.longitude),
      }))
      .filter((job) => job.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);

    return { data: jobsWithDistance, error: null };
  } catch (error) {
    console.error('Error searching nearby jobs:', error);
    return { data: [], error };
  }
}

/**
 * Get combined nearby listings (services and jobs)
 */
export async function searchNearbyListings(
  options: ProximitySearchOptions
): Promise<{
  services: ServiceListing[];
  jobs: JobListing[];
  error: any;
}> {
  const [servicesResult, jobsResult] = await Promise.all([
    searchNearbyServices(options),
    searchNearbyJobs(options),
  ]);

  return {
    services: servicesResult.data,
    jobs: jobsResult.data,
    error: servicesResult.error || jobsResult.error,
  };
}

/**
 * Get statistics about demo vs real listings in proximity
 */
export async function getProximityStats(
  userLatitude: number,
  userLongitude: number,
  radiusMiles: number = 5
): Promise<{
  totalServices: number;
  demoServices: number;
  realServices: number;
  totalJobs: number;
  demoJobs: number;
  realJobs: number;
}> {
  const bbox = getBoundingBox(userLatitude, userLongitude, radiusMiles);

  try {
    // Count services
    const { data: services } = await supabase
      .from('service_listings')
      .select('is_demo, latitude, longitude')
      .eq('status', 'Active')
      .gte('latitude', bbox.minLat)
      .lte('latitude', bbox.maxLat)
      .gte('longitude', bbox.minLon)
      .lte('longitude', bbox.maxLon);

    const servicesInRadius = (services || []).filter((service) => {
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        service.latitude,
        service.longitude
      );
      return distance <= radiusMiles;
    });

    // Count jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('is_demo, latitude, longitude')
      .eq('status', 'Open')
      .gte('latitude', bbox.minLat)
      .lte('latitude', bbox.maxLat)
      .gte('longitude', bbox.minLon)
      .lte('longitude', bbox.maxLon);

    const jobsInRadius = (jobs || []).filter((job) => {
      const distance = calculateDistance(userLatitude, userLongitude, job.latitude, job.longitude);
      return distance <= radiusMiles;
    });

    return {
      totalServices: servicesInRadius.length,
      demoServices: servicesInRadius.filter((s) => s.is_demo).length,
      realServices: servicesInRadius.filter((s) => !s.is_demo).length,
      totalJobs: jobsInRadius.length,
      demoJobs: jobsInRadius.filter((j) => j.is_demo).length,
      realJobs: jobsInRadius.filter((j) => !j.is_demo).length,
    };
  } catch (error) {
    console.error('Error getting proximity stats:', error);
    return {
      totalServices: 0,
      demoServices: 0,
      realServices: 0,
      totalJobs: 0,
      demoJobs: 0,
      realJobs: 0,
    };
  }
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return 'Less than 0.1 mi';
  } else if (miles < 1) {
    return `${miles.toFixed(1)} mi`;
  } else {
    return `${Math.round(miles)} mi`;
  }
}
