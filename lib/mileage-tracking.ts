import { supabase } from './supabase';

export type TripPurpose = 'Business' | 'Personal' | 'Commute';
export type TripType = 'OneWay' | 'RoundTrip';
export type SummaryPeriod = 'Monthly' | 'Quarterly' | 'Yearly';

export interface MileageVehicle {
  id: string;
  user_id: string;
  nickname: string;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  color: string | null;
  is_primary: boolean;
  odometer_reading: number;
  is_active: boolean;
  created_at: string;
}

export interface MileageTrip {
  id: string;
  user_id: string;
  booking_id: string | null;
  trip_date: string;
  start_location: string;
  start_coordinates: { x: number; y: number } | null;
  end_location: string;
  end_coordinates: { x: number; y: number } | null;
  distance_miles: number;
  distance_km: number | null;
  purpose: TripPurpose;
  trip_type: TripType;
  description: string | null;
  odometer_start: number | null;
  odometer_end: number | null;
  vehicle_id: string | null;
  rate_per_mile: number;
  reimbursement_amount: number;
  is_reimbursed: boolean;
  reimbursed_at: string | null;
  is_exported: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface MileageRate {
  id: string;
  year: number;
  rate_per_mile: number;
  rate_type: string;
  effective_date: string;
  end_date: string | null;
  is_irs_rate: boolean;
  source: string | null;
  created_at: string;
}

export interface MileageSummary {
  id: string;
  user_id: string;
  summary_period: SummaryPeriod;
  start_date: string;
  end_date: string;
  total_trips: number;
  total_business_miles: number;
  total_personal_miles: number;
  total_commute_miles: number;
  business_percentage: number;
  total_reimbursement: number;
  total_deduction: number;
  vehicle_id: string | null;
  created_at: string;
}

export interface MileageRoute {
  id: string;
  user_id: string;
  name: string;
  start_location: string;
  start_coordinates: { x: number; y: number } | null;
  end_location: string;
  end_coordinates: { x: number; y: number } | null;
  distance_miles: number;
  distance_km: number | null;
  is_round_trip: boolean;
  usage_count: number;
  created_at: string;
}

/**
 * Get user vehicles
 */
export async function getUserVehicles(userId: string): Promise<MileageVehicle[]> {
  try {
    const { data, error } = await supabase
      .from('mileage_vehicles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
}

/**
 * Get primary vehicle
 */
export async function getPrimaryVehicle(userId: string): Promise<MileageVehicle | null> {
  try {
    const { data, error } = await supabase
      .from('mileage_vehicles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching primary vehicle:', error);
    return null;
  }
}

/**
 * Create vehicle
 */
export async function createVehicle(
  vehicle: Omit<MileageVehicle, 'id' | 'created_at'>
): Promise<MileageVehicle | null> {
  try {
    if (vehicle.is_primary) {
      await supabase
        .from('mileage_vehicles')
        .update({ is_primary: false })
        .eq('user_id', vehicle.user_id);
    }

    const { data, error } = await supabase
      .from('mileage_vehicles')
      .insert([vehicle])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return null;
  }
}

/**
 * Update vehicle
 */
export async function updateVehicle(
  vehicleId: string,
  updates: Partial<MileageVehicle>
): Promise<MileageVehicle | null> {
  try {
    if (updates.is_primary) {
      const vehicle = await supabase
        .from('mileage_vehicles')
        .select('user_id')
        .eq('id', vehicleId)
        .single();

      if (vehicle.data) {
        await supabase
          .from('mileage_vehicles')
          .update({ is_primary: false })
          .eq('user_id', vehicle.data.user_id);
      }
    }

    const { data, error } = await supabase
      .from('mileage_vehicles')
      .update(updates)
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return null;
  }
}

/**
 * Get user trips
 */
export async function getUserTrips(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<MileageTrip[]> {
  try {
    let query = supabase
      .from('mileage_trips')
      .select('*')
      .eq('user_id', userId)
      .order('trip_date', { ascending: false });

    if (startDate) {
      query = query.gte('trip_date', startDate);
    }
    if (endDate) {
      query = query.lte('trip_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
}

/**
 * Get trip by ID
 */
export async function getTripById(tripId: string): Promise<MileageTrip | null> {
  try {
    const { data, error } = await supabase
      .from('mileage_trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
}

/**
 * Create trip
 */
export async function createTrip(
  trip: Omit<MileageTrip, 'id' | 'created_at' | 'updated_at' | 'distance_km' | 'reimbursement_amount'>
): Promise<MileageTrip | null> {
  try {
    const { data, error } = await supabase
      .from('mileage_trips')
      .insert([trip])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating trip:', error);
    return null;
  }
}

/**
 * Update trip
 */
export async function updateTrip(
  tripId: string,
  updates: Partial<MileageTrip>
): Promise<MileageTrip | null> {
  try {
    const { data, error } = await supabase
      .from('mileage_trips')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating trip:', error);
    return null;
  }
}

/**
 * Delete trip
 */
export async function deleteTrip(tripId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mileage_trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting trip:', error);
    return false;
  }
}

/**
 * Get current IRS rate
 */
export async function getCurrentIRSRate(rateType: string = 'Business'): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_current_irs_rate', {
      rate_type_param: rateType,
    });

    if (error) throw error;
    return data || 0.67;
  } catch (error) {
    console.error('Error fetching IRS rate:', error);
    return 0.67;
  }
}

/**
 * Get all IRS rates
 */
export async function getIRSRates(): Promise<MileageRate[]> {
  try {
    const { data, error } = await supabase
      .from('mileage_rates')
      .select('*')
      .eq('is_irs_rate', true)
      .order('year', { ascending: false })
      .order('effective_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching IRS rates:', error);
    return [];
  }
}

/**
 * Get mileage summaries
 */
export async function getMileageSummaries(
  userId: string,
  period?: SummaryPeriod
): Promise<MileageSummary[]> {
  try {
    let query = supabase
      .from('mileage_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (period) {
      query = query.eq('summary_period', period);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return [];
  }
}

/**
 * Generate mileage summary
 */
export async function generateMileageSummary(
  userId: string,
  startDate: string,
  endDate: string,
  period: SummaryPeriod
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('update_mileage_summary', {
      user_id_param: userId,
      start_date_param: startDate,
      end_date_param: endDate,
      period_param: period,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error generating summary:', error);
    return false;
  }
}

/**
 * Get saved routes
 */
export async function getSavedRoutes(userId: string): Promise<MileageRoute[]> {
  try {
    const { data, error } = await supabase
      .from('mileage_routes')
      .select('*')
      .eq('user_id', userId)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
}

/**
 * Create saved route
 */
export async function createRoute(
  route: Omit<MileageRoute, 'id' | 'created_at' | 'usage_count'>
): Promise<MileageRoute | null> {
  try {
    const { data, error } = await supabase
      .from('mileage_routes')
      .insert([{ ...route, usage_count: 0 }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating route:', error);
    return null;
  }
}

/**
 * Create trip from route
 */
export async function createTripFromRoute(
  userId: string,
  routeId: string,
  tripDate: string,
  purpose: TripPurpose,
  vehicleId?: string
): Promise<MileageTrip | null> {
  try {
    const route = await supabase
      .from('mileage_routes')
      .select('*')
      .eq('id', routeId)
      .single();

    if (!route.data) return null;

    const rate = await getCurrentIRSRate();

    const distance = route.data.is_round_trip
      ? route.data.distance_miles * 2
      : route.data.distance_miles;

    const trip = await createTrip({
      user_id: userId,
      booking_id: null,
      trip_date: tripDate,
      start_location: route.data.start_location,
      start_coordinates: route.data.start_coordinates,
      end_location: route.data.end_location,
      end_coordinates: route.data.end_coordinates,
      distance_miles: distance,
      purpose,
      trip_type: route.data.is_round_trip ? 'RoundTrip' : 'OneWay',
      description: `From saved route: ${route.data.name}`,
      odometer_start: null,
      odometer_end: null,
      vehicle_id: vehicleId || null,
      rate_per_mile: rate,
      is_reimbursed: false,
      reimbursed_at: null,
      is_exported: false,
      tags: [],
    });

    if (trip) {
      await supabase
        .from('mileage_routes')
        .update({ usage_count: route.data.usage_count + 1 })
        .eq('id', routeId);
    }

    return trip;
  } catch (error) {
    console.error('Error creating trip from route:', error);
    return null;
  }
}

/**
 * Calculate distance between coordinates
 */
export async function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_distance_miles', {
      lat1,
      lon1,
      lat2,
      lon2,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return 0;
  }
}

/**
 * Get trip statistics
 */
export async function getTripStatistics(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalTrips: number;
  totalMiles: number;
  businessMiles: number;
  personalMiles: number;
  totalReimbursement: number;
  avgTripDistance: number;
} | null> {
  try {
    const trips = await getUserTrips(userId, startDate, endDate);

    const totalTrips = trips.length;
    const totalMiles = trips.reduce((sum, t) => sum + t.distance_miles, 0);
    const businessMiles = trips
      .filter((t) => t.purpose === 'Business')
      .reduce((sum, t) => sum + t.distance_miles, 0);
    const personalMiles = trips
      .filter((t) => t.purpose === 'Personal')
      .reduce((sum, t) => sum + t.distance_miles, 0);
    const totalReimbursement = trips.reduce(
      (sum, t) => sum + t.reimbursement_amount,
      0
    );
    const avgTripDistance = totalTrips > 0 ? totalMiles / totalTrips : 0;

    return {
      totalTrips,
      totalMiles,
      businessMiles,
      personalMiles,
      totalReimbursement,
      avgTripDistance,
    };
  } catch (error) {
    console.error('Error fetching trip statistics:', error);
    return null;
  }
}

/**
 * Export trips to CSV format
 */
export function exportTripsToCSV(trips: MileageTrip[]): string {
  const headers = [
    'Date',
    'Start Location',
    'End Location',
    'Distance (miles)',
    'Purpose',
    'Trip Type',
    'Description',
    'Rate/Mile',
    'Reimbursement',
  ];

  const rows = trips.map((trip) => [
    trip.trip_date,
    trip.start_location,
    trip.end_location,
    trip.distance_miles.toFixed(2),
    trip.purpose,
    trip.trip_type,
    trip.description || '',
    trip.rate_per_mile.toFixed(3),
    trip.reimbursement_amount.toFixed(2),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number, showKm: boolean = false): string {
  if (showKm) {
    const km = miles * 1.60934;
    return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
  }
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Get trip purpose options
 */
export function getTripPurposeOptions(): Array<{
  value: TripPurpose;
  label: string;
}> {
  return [
    { value: 'Business', label: 'Business' },
    { value: 'Personal', label: 'Personal' },
    { value: 'Commute', label: 'Commute' },
  ];
}

/**
 * Get trip type options
 */
export function getTripTypeOptions(): Array<{
  value: TripType;
  label: string;
}> {
  return [
    { value: 'OneWay', label: 'One Way' },
    { value: 'RoundTrip', label: 'Round Trip' },
  ];
}

/**
 * Validate trip data
 */
export function validateTrip(trip: {
  start_location: string;
  end_location: string;
  distance_miles: number;
  trip_date: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!trip.start_location || trip.start_location.trim().length === 0) {
    errors.push('Start location is required');
  }

  if (!trip.end_location || trip.end_location.trim().length === 0) {
    errors.push('End location is required');
  }

  if (!trip.distance_miles || trip.distance_miles <= 0) {
    errors.push('Distance must be greater than 0');
  }

  if (trip.distance_miles > 1000) {
    errors.push('Distance seems unusually high (over 1000 miles)');
  }

  if (!trip.trip_date) {
    errors.push('Trip date is required');
  }

  const tripDate = new Date(trip.trip_date);
  const today = new Date();
  if (tripDate > today) {
    errors.push('Trip date cannot be in the future');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate business percentage
 */
export function calculateBusinessPercentage(
  businessMiles: number,
  totalMiles: number
): number {
  if (totalMiles === 0) return 0;
  return (businessMiles / totalMiles) * 100;
}
