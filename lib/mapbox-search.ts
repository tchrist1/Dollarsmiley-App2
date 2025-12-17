import Constants from 'expo-constants';
import uuid from 'react-native-uuid';

const MAPBOX_ACCESS_TOKEN = Constants.expoConfig?.extra?.mapboxAccessToken ||
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

export function generateSessionToken(): string {
  return uuid.v4() as string;
}

export interface MapboxSuggestion {
  id: string;
  name: string;
  full_address: string;
  place_formatted: string;
  context?: {
    address?: { street_number?: string; name?: string };
    neighborhood?: { name?: string };
    postcode?: { name?: string };
    place?: { name?: string };
    region?: { name?: string; region_code?: string };
    country?: { name?: string; country_code?: string };
  };
  geometry: {
    coordinates: [number, number];
  };
}

export interface ParsedAddress {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number;
  longitude: number;
  formatted_address: string;
}

export async function searchMapboxPlaces(
  query: string,
  options: {
    proximity?: [number, number];
    types?: string[];
    limit?: number;
    country?: string[];
    sessionToken?: string;
  } = {}
): Promise<MapboxSuggestion[]> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('Mapbox access token not found');
    return [];
  }

  if (!query || query.length < 3) {
    return [];
  }

  try {
    const sessionToken = options.sessionToken || generateSessionToken();

    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      session_token: sessionToken,
      limit: (options.limit || 10).toString(),
      language: 'en',
    });

    if (options.proximity) {
      params.append('proximity', options.proximity.join(','));
    }

    if (options.types && options.types.length > 0) {
      params.append('types', options.types.join(','));
    }

    if (options.country && options.country.length > 0) {
      params.append('country', options.country.join(','));
    }

    const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
      query
    )}&${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Mapbox Search] API error:', response.status, response.statusText);
      console.error('[Mapbox Search] Error details:', errorText);
      return [];
    }

    const data = await response.json();

    if (!data.suggestions || !Array.isArray(data.suggestions)) {
      console.warn('[Mapbox Search] No suggestions found for:', query);
      return [];
    }

    console.log(`[Mapbox Search] Found ${data.suggestions.length} results for: "${query}"`);

    return data.suggestions.map((suggestion: any) => ({
      id: suggestion.mapbox_id || suggestion.id,
      name: suggestion.name,
      full_address: suggestion.full_address || suggestion.place_formatted,
      place_formatted: suggestion.place_formatted,
      context: suggestion.context,
      geometry: suggestion.geometry || { coordinates: [0, 0] },
    }));
  } catch (error) {
    console.error('[Mapbox Search] Error searching Mapbox places:', error);
    return [];
  }
}

export async function retrieveMapboxPlace(
  mapboxId: string,
  sessionToken?: string
): Promise<MapboxSuggestion | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('Mapbox access token not found');
    return null;
  }

  try {
    const token = sessionToken || generateSessionToken();
    const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?session_token=${token}&access_token=${MAPBOX_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Mapbox retrieve API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];

    return {
      id: feature.id,
      name: feature.properties.name,
      full_address: feature.properties.full_address || feature.properties.place_formatted,
      place_formatted: feature.properties.place_formatted,
      context: feature.properties.context,
      geometry: feature.geometry,
    };
  } catch (error) {
    console.error('Error retrieving Mapbox place:', error);
    return null;
  }
}

export function parseMapboxAddress(suggestion: MapboxSuggestion): ParsedAddress {
  const context = suggestion.context || {};
  const address = context.address || {};
  const postcode = context.postcode || {};
  const place = context.place || {};
  const region = context.region || {};
  const country = context.country || {};

  const streetNumber = address.street_number || '';
  const streetName = address.name || '';
  const street = `${streetNumber} ${streetName}`.trim();

  const city = place.name || '';
  const state = region.region_code || region.name || '';
  const zipCode = postcode.name || '';
  const countryCode = country.country_code || 'US';

  const [longitude, latitude] = suggestion.geometry.coordinates;

  return {
    street_address: street || suggestion.name,
    city,
    state,
    zip_code: zipCode,
    country: countryCode.toUpperCase(),
    latitude,
    longitude,
    formatted_address: suggestion.full_address || suggestion.place_formatted,
  };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ParsedAddress | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('Mapbox access token not found');
    return null;
  }

  try {
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&types=address&access_token=${MAPBOX_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Mapbox reverse geocode error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.log('[Mapbox Reverse Geocode] No features found');
      return null;
    }

    const feature = data.features[0];
    const properties = feature.properties;
    const context = properties.context || {};

    const address = context.address || {};
    const postcode = context.postcode || {};
    const place = context.place || {};
    const region = context.region || {};
    const country = context.country || {};

    const streetNumber = address.street_number || '';
    const streetName = address.name || '';
    const street = `${streetNumber} ${streetName}`.trim();

    return {
      street_address: street || properties.name || '',
      city: place.name || '',
      state: region.region_code || region.name || '',
      zip_code: postcode.name || '',
      country: (country.country_code || 'US').toUpperCase(),
      latitude,
      longitude,
      formatted_address: properties.full_address || properties.place_formatted || '',
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}
