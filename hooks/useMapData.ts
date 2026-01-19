/**
 * PHASE 2: MAP DATA HOOK
 *
 * Manages geolocation, location permissions, and map-related state.
 * Handles delayed permission requests to avoid blocking initial render.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

// ============================================================================
// TYPES
// ============================================================================

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface UseMapDataOptions {
  userProfileLocation?: LocationCoords | null;
  requestDelayMs?: number;
  enabled?: boolean;
}

interface UseMapDataReturn {
  userLocation: LocationCoords | null;
  searchLocation: LocationCoords | null;
  locationPermissionStatus: 'granted' | 'denied' | 'undetermined';
  loading: boolean;
  error: string | null;
  setSearchLocation: (location: LocationCoords | null) => void;
  requestLocationPermission: () => Promise<void>;
  refreshLocation: () => Promise<void>;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useMapData({
  userProfileLocation = null,
  requestDelayMs = 500,
  enabled = true,
}: UseMapDataOptions): UseMapDataReturn {
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [searchLocation, setSearchLocation] = useState<LocationCoords | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Request location permission
  const requestLocationPermission = useCallback(async () => {
    if (!enabled) return;
    if (hasRequestedRef.current) return;

    hasRequestedRef.current = true;
    setLoading(true);

    try {
      // Use profile location if available
      if (userProfileLocation) {
        if (isMountedRef.current) {
          setUserLocation(userProfileLocation);
          setLocationPermissionStatus('granted');
          setError(null);
        }
        return;
      }

      // Check existing permission
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

      if (existingStatus === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 0,
        });

        if (isMountedRef.current) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLocationPermissionStatus('granted');
          setError(null);
        }
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (isMountedRef.current) {
          setLocationPermissionStatus('denied');
          setError('Location permission denied');
        }
        return;
      }

      // Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 0,
      });

      if (isMountedRef.current) {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLocationPermissionStatus('granted');
        setError(null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err.message || 'Failed to get location');
      setLocationPermissionStatus('denied');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, userProfileLocation]);

  // Delayed permission request
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      requestLocationPermission();
    }, requestDelayMs);

    return () => clearTimeout(timer);
  }, [enabled, requestDelayMs, requestLocationPermission]);

  // Refresh location
  const refreshLocation = useCallback(async () => {
    if (locationPermissionStatus !== 'granted') {
      await requestLocationPermission();
      return;
    }

    setLoading(true);

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 0,
      });

      if (isMountedRef.current) {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setError(null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err.message || 'Failed to refresh location');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [locationPermissionStatus, requestLocationPermission]);

  // Sync profile location
  useEffect(() => {
    if (userProfileLocation && !userLocation) {
      setUserLocation(userProfileLocation);
      setLocationPermissionStatus('granted');
    }
  }, [userProfileLocation, userLocation]);

  return {
    userLocation,
    searchLocation,
    locationPermissionStatus,
    loading,
    error,
    setSearchLocation,
    requestLocationPermission,
    refreshLocation,
  };
}
