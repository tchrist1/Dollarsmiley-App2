/**
 * Trip Management Library
 *
 * Handles trip creation, tracking, and status management for real-time
 * map-based tracking of movements between locations.
 */

import { supabase } from './supabase';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type TripStatus = 'not_started' | 'on_the_way' | 'arriving_soon' | 'arrived' | 'completed' | 'canceled';
export type MoverType = 'provider' | 'customer';
export type TripType = 'on_site_service' | 'customer_pickup' | 'provider_dropoff' | 'provider_pickup' | 'customer_dropoff';
export type ServiceType = 'job' | 'service' | 'custom_service';

export interface Trip {
  id: string;
  booking_id: string;
  leg_number: number;
  total_legs: number;
  mover_id: string;
  mover_type: MoverType;
  trip_type: TripType;
  service_type: ServiceType;
  origin_address?: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  current_latitude?: number;
  current_longitude?: number;
  current_heading?: number;
  current_speed?: number;
  last_location_update_at?: string;
  trip_status: TripStatus;
  started_at?: string;
  arriving_soon_at?: string;
  arrived_at?: string;
  completed_at?: string;
  canceled_at?: string;
  estimated_arrival_time?: string;
  estimated_distance_meters?: number;
  estimated_duration_seconds?: number;
  live_location_visible: boolean;
  viewer_id?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  altitude?: number;
}

let locationSubscription: Location.LocationSubscription | null = null;

/**
 * Create trips for a booking based on fulfillment type
 */
export async function createTripsForBooking(
  bookingId: string,
  fulfillmentType?: string
): Promise<Trip[]> {
  try {
    const { data, error } = await supabase.rpc('create_trips_for_booking', {
      p_booking_id: bookingId,
      p_fulfillment_type: fulfillmentType || null,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error creating trips:', error);
    throw error;
  }
}

/**
 * Get all trips for a booking
 */
export async function getTripsForBooking(bookingId: string): Promise<Trip[]> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('booking_id', bookingId)
      .order('leg_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
}

/**
 * Get active trip for a booking (first non-completed trip)
 */
export async function getActiveTrip(bookingId: string): Promise<Trip | null> {
  try {
    const { data, error } = await supabase.rpc('get_active_trip', {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching active trip:', error);
    return null;
  }
}

/**
 * Get a single trip by ID
 */
export async function getTrip(tripId: string): Promise<Trip | null> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
}

/**
 * Start a trip (change status to on_the_way)
 */
export async function startTrip(tripId: string): Promise<Trip | null> {
  try {
    const { data, error } = await supabase.rpc('start_trip', {
      p_trip_id: tripId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error starting trip:', error);
    throw error;
  }
}

/**
 * Mark trip as arrived
 */
export async function markTripArrived(tripId: string): Promise<Trip | null> {
  try {
    const { data, error } = await supabase.rpc('mark_trip_arrived', {
      p_trip_id: tripId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking trip arrived:', error);
    throw error;
  }
}

/**
 * Complete a trip
 */
export async function completeTrip(tripId: string): Promise<Trip | null> {
  try {
    const { data, error } = await supabase.rpc('complete_trip', {
      p_trip_id: tripId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error completing trip:', error);
    throw error;
  }
}

/**
 * Cancel a trip
 */
export async function cancelTrip(tripId: string): Promise<Trip | null> {
  try {
    const { data, error } = await supabase.rpc('cancel_trip', {
      p_trip_id: tripId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error canceling trip:', error);
    throw error;
  }
}

/**
 * Update trip with current location
 */
export async function updateTripLocation(
  tripId: string,
  location: LocationUpdate
): Promise<Trip | null> {
  try {
    const { data, error } = await supabase.rpc('update_trip_location', {
      p_trip_id: tripId,
      p_latitude: location.latitude,
      p_longitude: location.longitude,
      p_heading: location.heading || null,
      p_speed: location.speed || null,
      p_accuracy: location.accuracy || null,
      p_update_source: 'app',
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating trip location:', error);
    return null;
  }
}

/**
 * Get location tracking permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') return false;

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    return backgroundStatus === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Start live location tracking for a trip
 */
export async function startLocationTracking(
  tripId: string,
  onLocationUpdate?: (location: LocationUpdate) => void
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    await stopLocationTracking();

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return false;

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      async (location) => {
        const update: LocationUpdate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading || undefined,
          speed: location.coords.speed || undefined,
          accuracy: location.coords.accuracy || undefined,
          altitude: location.coords.altitude || undefined,
        };

        await updateTripLocation(tripId, update);

        if (onLocationUpdate) {
          onLocationUpdate(update);
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error starting location tracking:', error);
    return false;
  }
}

/**
 * Stop live location tracking
 */
export async function stopLocationTracking(): Promise<void> {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
}

/**
 * Get recent location updates for a trip
 */
export async function getTripLocationHistory(
  tripId: string,
  limit: number = 100
): Promise<LocationUpdate[]> {
  try {
    const { data, error } = await supabase
      .from('trip_location_updates')
      .select('latitude, longitude, heading, speed, accuracy, altitude, recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching location history:', error);
    return [];
  }
}

/**
 * Subscribe to real-time trip updates
 */
export function subscribeToTrip(
  tripId: string,
  onUpdate: (trip: Trip) => void
): () => void {
  const channel = supabase
    .channel(`trip:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trips',
        filter: `id=eq.${tripId}`,
      },
      (payload) => {
        onUpdate(payload.new as Trip);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to all trips for a booking
 */
export function subscribeToBookingTrips(
  bookingId: string,
  onUpdate: (trip: Trip) => void
): () => void {
  const channel = supabase
    .channel(`booking-trips:${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trips',
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        if (payload.eventType !== 'DELETE') {
          onUpdate(payload.new as Trip);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Calculate distance between two coordinates (in meters)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format ETA for display
 */
export function formatETA(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.max(0, Math.round(diffMs / 60000));

  if (diffMins < 1) return 'Less than a minute';
  if (diffMins === 1) return '1 minute';
  if (diffMins < 60) return `${diffMins} minutes`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/**
 * Get trip type description
 */
export function getTripTypeDescription(tripType: TripType, moverType: MoverType): string {
  switch (tripType) {
    case 'on_site_service':
      return 'Traveling to service location';
    case 'customer_pickup':
      return 'Customer traveling to pickup';
    case 'provider_dropoff':
      return 'Provider delivering to customer';
    case 'provider_pickup':
      return 'Provider picking up from customer';
    case 'customer_dropoff':
      return 'Customer returning to provider';
    default:
      return moverType === 'provider' ? 'Provider on the way' : 'Customer on the way';
  }
}

/**
 * Check if user is the mover for a trip
 */
export function isUserMover(trip: Trip, userId: string): boolean {
  return trip.mover_id === userId;
}

/**
 * Check if user is the viewer for a trip
 */
export function isUserViewer(trip: Trip, userId: string): boolean {
  return trip.viewer_id === userId;
}

/**
 * Get the next leg of a multi-leg trip
 */
export async function getNextLeg(
  bookingId: string,
  currentLegNumber: number
): Promise<Trip | null> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('leg_number', currentLegNumber + 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching next leg:', error);
    return null;
  }
}
