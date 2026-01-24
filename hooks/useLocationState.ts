/**
 * PHASE 1C: UNIFIED LOCATION STATE
 *
 * Single source of truth for location data (address + coordinates).
 * Ensures atomic updates and prevents desync issues.
 *
 * DISPLAY-SAFE: Read-only consumption by UI components.
 */

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedLocation {
  address: string;
  latitude: number | undefined;
  longitude: number | undefined;
}

export interface UseLocationStateReturn {
  location: UnifiedLocation;
  setLocationFromAddress: (address: string) => void;
  setLocationFromCoordinates: (lat: number, lng: number, address?: string) => Promise<void>;
  setLocationAtomic: (address: string, lat: number, lng: number) => void;
  clearLocation: () => void;
  geocodeAddress: (address: string) => Promise<{ lat: number; lng: number } | null>;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const EMPTY_LOCATION: UnifiedLocation = {
  address: '',
  latitude: undefined,
  longitude: undefined,
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useLocationState(
  initialLocation?: UnifiedLocation
): UseLocationStateReturn {
  const [location, setLocation] = useState<UnifiedLocation>(
    initialLocation || EMPTY_LOCATION
  );

  /**
   * Set location from address string only (coordinates TBD by geocoding later).
   * This is for when user types an address manually.
   */
  const setLocationFromAddress = useCallback((address: string) => {
    setLocation({
      address,
      latitude: undefined,
      longitude: undefined,
    });
  }, []);

  /**
   * Geocode an address string to coordinates.
   * Returns coordinates or null if geocoding fails.
   */
  const geocodeAddress = useCallback(async (address: string) => {
    if (!address.trim()) return null;

    try {
      const results = await Location.geocodeAsync(address);
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        return { lat: latitude, lng: longitude };
      }
      return null;
    } catch (error) {
      if (__DEV__) {
        console.warn('[useLocationState] Geocoding failed:', error);
      }
      return null;
    }
  }, []);

  /**
   * Set location from coordinates with optional address.
   * If no address provided, attempts reverse geocoding.
   * ATOMIC: Both address and coordinates are set together.
   */
  const setLocationFromCoordinates = useCallback(
    async (lat: number, lng: number, address?: string) => {
      if (address) {
        // Address provided - set atomically
        setLocation({
          address,
          latitude: lat,
          longitude: lng,
        });
        return;
      }

      // No address - attempt reverse geocoding
      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });

        let addressString = '';
        if (geocode) {
          const parts = [geocode.city, geocode.region, geocode.postalCode].filter(
            Boolean
          );
          addressString = parts.join(', ');
        } else {
          addressString = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }

        setLocation({
          address: addressString,
          latitude: lat,
          longitude: lng,
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('[useLocationState] Reverse geocoding failed:', error);
        }
        // Fallback to coordinate string
        setLocation({
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          latitude: lat,
          longitude: lng,
        });
      }
    },
    []
  );

  /**
   * Set location atomically with all data provided.
   * This is the safest method - no async operations, no desync possible.
   */
  const setLocationAtomic = useCallback(
    (address: string, lat: number, lng: number) => {
      setLocation({
        address,
        latitude: lat,
        longitude: lng,
      });
    },
    []
  );

  /**
   * Clear location state.
   */
  const clearLocation = useCallback(() => {
    setLocation(EMPTY_LOCATION);
  }, []);

  return {
    location,
    setLocationFromAddress,
    setLocationFromCoordinates,
    setLocationAtomic,
    clearLocation,
    geocodeAddress,
  };
}
