import { Platform } from 'react-native';
import { MAPBOX_CONFIG } from '@/config/native-modules';

export interface MapboxLocation {
  latitude: number;
  longitude: number;
}

export interface MapboxBounds {
  ne: [number, number];
  sw: [number, number];
}

export interface MapboxRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const isMapboxConfigured = (): boolean => {
  return !!MAPBOX_CONFIG.accessToken && MAPBOX_CONFIG.accessToken.length > 0;
};

export const isNativeMapSupported = (): boolean => {
  return Platform.OS !== 'web' && isMapboxConfigured();
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'miles' | 'km' | 'meters' = 'miles'
): number => {
  const R = unit === 'km' ? 6371 : unit === 'meters' ? 6371000 : 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDistance = (
  distanceInMiles: number,
  includeUnit: boolean = true
): string => {
  if (distanceInMiles < 0.1) {
    const feet = Math.round(distanceInMiles * 5280);
    return includeUnit ? `${feet} ft` : feet.toString();
  }

  if (distanceInMiles < 1) {
    const decimal = distanceInMiles.toFixed(1);
    return includeUnit ? `${decimal} mi` : decimal;
  }

  const rounded = Math.round(distanceInMiles);
  return includeUnit ? `${rounded} mi` : rounded.toString();
};

export const calculateBounds = (locations: MapboxLocation[]): MapboxBounds => {
  if (locations.length === 0) {
    return {
      ne: [-74.006, 40.7128],
      sw: [-74.006, 40.7128],
    };
  }

  let minLat = locations[0].latitude;
  let maxLat = locations[0].latitude;
  let minLng = locations[0].longitude;
  let maxLng = locations[0].longitude;

  locations.forEach((location) => {
    minLat = Math.min(minLat, location.latitude);
    maxLat = Math.max(maxLat, location.latitude);
    minLng = Math.min(minLng, location.longitude);
    maxLng = Math.max(maxLng, location.longitude);
  });

  return {
    ne: [maxLng, maxLat],
    sw: [minLng, minLat],
  };
};

export const boundsToRegion = (bounds: MapboxBounds, padding: number = 0.1): MapboxRegion => {
  const centerLat = (bounds.ne[1] + bounds.sw[1]) / 2;
  const centerLng = (bounds.ne[0] + bounds.sw[0]) / 2;
  const latDelta = Math.abs(bounds.ne[1] - bounds.sw[1]) * (1 + padding);
  const lngDelta = Math.abs(bounds.ne[0] - bounds.sw[0]) * (1 + padding);

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latDelta, 0.01),
    longitudeDelta: Math.max(lngDelta, 0.01),
  };
};

export const regionToBounds = (region: MapboxRegion): MapboxBounds => {
  const halfLatDelta = region.latitudeDelta / 2;
  const halfLngDelta = region.longitudeDelta / 2;

  return {
    ne: [region.longitude + halfLngDelta, region.latitude + halfLatDelta],
    sw: [region.longitude - halfLngDelta, region.latitude - halfLatDelta],
  };
};

export const isLocationInBounds = (location: MapboxLocation, bounds: MapboxBounds): boolean => {
  return (
    location.latitude >= bounds.sw[1] &&
    location.latitude <= bounds.ne[1] &&
    location.longitude >= bounds.sw[0] &&
    location.longitude <= bounds.ne[0]
  );
};

export const isLocationInRegion = (location: MapboxLocation, region: MapboxRegion): boolean => {
  const bounds = regionToBounds(region);
  return isLocationInBounds(location, bounds);
};

export const getZoomLevelFromRegion = (region: MapboxRegion): number => {
  return Math.log2(360 / Math.max(region.latitudeDelta, region.longitudeDelta));
};

export const getRegionFromZoomLevel = (
  center: MapboxLocation,
  zoomLevel: number
): MapboxRegion => {
  const delta = 360 / Math.pow(2, zoomLevel);

  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
};

export const sortLocationsByDistance = <T extends MapboxLocation>(
  locations: T[],
  referencePoint: MapboxLocation
): T[] => {
  return [...locations].sort((a, b) => {
    const distA = calculateDistance(
      referencePoint.latitude,
      referencePoint.longitude,
      a.latitude,
      a.longitude
    );
    const distB = calculateDistance(
      referencePoint.latitude,
      referencePoint.longitude,
      b.latitude,
      b.longitude
    );
    return distA - distB;
  });
};

export const filterLocationsByDistance = <T extends MapboxLocation>(
  locations: T[],
  referencePoint: MapboxLocation,
  maxDistanceMiles: number
): T[] => {
  return locations.filter((location) => {
    const distance = calculateDistance(
      referencePoint.latitude,
      referencePoint.longitude,
      location.latitude,
      location.longitude
    );
    return distance <= maxDistanceMiles;
  });
};

export const geocodeToCoordinates = async (address: string): Promise<MapboxLocation | null> => {
  if (!isMapboxConfigured()) {
    console.warn('Mapbox not configured for geocoding');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_CONFIG.accessToken}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return { latitude, longitude };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const reverseGeocode = async (location: MapboxLocation): Promise<string | null> => {
  if (!isMapboxConfigured()) {
    console.warn('Mapbox not configured for reverse geocoding');
    return null;
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.longitude},${location.latitude}.json?access_token=${MAPBOX_CONFIG.accessToken}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

export const getMapStyleUrl = (style: 'streets' | 'satellite' | 'dark' | 'light' | 'outdoors' | 'navigation'): string => {
  const styleMap = {
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11',
    light: 'mapbox://styles/mapbox/light-v11',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    navigation: 'mapbox://styles/mapbox/navigation-day-v1',
  };

  return styleMap[style] || styleMap.streets;
};

export const clusterLocations = <T extends MapboxLocation>(
  locations: T[],
  region: MapboxRegion,
  clusterRadius: number = 60
): Array<T | { locations: T[]; count: number } & MapboxLocation> => {
  if (locations.length === 0) {
    return [];
  }

  const clustered: Array<T | { locations: T[]; count: number } & MapboxLocation> = [];
  const processed = new Set<number>();

  locations.forEach((location, index) => {
    if (processed.has(index)) return;

    const nearby: T[] = [];

    locations.forEach((otherLocation, otherIndex) => {
      if (index === otherIndex || processed.has(otherIndex)) return;

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        otherLocation.latitude,
        otherLocation.longitude,
        'meters'
      );

      if (distance < clusterRadius) {
        nearby.push(otherLocation);
        processed.add(otherIndex);
      }
    });

    if (nearby.length > 0) {
      const allLocations = [location, ...nearby];
      const avgLat = allLocations.reduce((sum, loc) => sum + loc.latitude, 0) / allLocations.length;
      const avgLng = allLocations.reduce((sum, loc) => sum + loc.longitude, 0) / allLocations.length;

      clustered.push({
        latitude: avgLat,
        longitude: avgLng,
        locations: allLocations,
        count: allLocations.length,
      });
      processed.add(index);
    } else {
      clustered.push(location);
      processed.add(index);
    }
  });

  return clustered;
};

export const DEFAULT_REGION: MapboxRegion = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export const MAP_STYLES = {
  streets: getMapStyleUrl('streets'),
  satellite: getMapStyleUrl('satellite'),
  dark: getMapStyleUrl('dark'),
  light: getMapStyleUrl('light'),
  outdoors: getMapStyleUrl('outdoors'),
  navigation: getMapStyleUrl('navigation'),
} as const;
