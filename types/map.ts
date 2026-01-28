export type MapViewMode = 'listings' | 'providers' | 'services' | 'jobs_all' | 'jobs_fixed' | 'jobs_quoted';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
  type?: 'listing' | 'provider';
  listingType?: 'Service' | 'CustomService' | 'Job';
  pricingType?: 'fixed_price' | 'quote_based';
  subtitle?: string;
  rating?: number;
  isVerified?: boolean;
  reviewCount?: number;
  categories?: string[];
  responseTime?: string;
  completionRate?: number;
  avatarUrl?: string;
  tier?: 'primary' | 'nearby'; // Nearby Options: distinguish primary vs expanded results
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
