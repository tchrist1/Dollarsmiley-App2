import { supabase } from './supabase';

export type ConflictType = 'double_booking' | 'travel_time' | 'capacity' | 'buffer_violation' | 'availability';
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';
export type CapacityRecommendation = 'expand' | 'maintain' | 'reduce' | 'block';

export interface SchedulingPreferences {
  id: string;
  provider_id: string;
  min_booking_notice_hours: number;
  max_bookings_per_day: number;
  preferred_booking_duration_minutes: number;
  buffer_time_minutes: number;
  travel_time_buffer_minutes: number;
  auto_accept_within_hours: number;
  price_surge_enabled: boolean;
  price_surge_multiplier: number;
  allow_back_to_back: boolean;
  preferred_times: Record<string, boolean>;
  updated_at: string;
}

export interface TimeSlotSuggestion {
  id: string;
  job_id: string | null;
  provider_id: string;
  suggested_date: string;
  suggested_start_time: string;
  suggested_end_time: string;
  confidence_score: number;
  reasoning: string | null;
  factors: Record<string, any>;
  is_optimal: boolean;
  price_estimate: number | null;
  travel_time_minutes: number;
  created_at: string;
  expires_at: string;
}

export interface SchedulingPattern {
  id: string;
  provider_id: string;
  pattern_type: string;
  pattern_data: Record<string, any>;
  booking_frequency: number;
  avg_duration_minutes: number;
  avg_price: number;
  confidence_level: number;
  last_updated: string;
}

export interface WorkloadPrediction {
  id: string;
  provider_id: string;
  prediction_date: string;
  predicted_bookings: number;
  predicted_revenue: number;
  capacity_utilization: number;
  confidence_score: number;
  factors: Record<string, any>;
  created_at: string;
}

export interface SchedulingConflict {
  id: string;
  provider_id: string;
  conflict_type: ConflictType;
  booking_ids: string[];
  detected_at: string;
  resolved_at: string | null;
  resolution_method: string | null;
  is_resolved: boolean;
}

export interface OptimalPricing {
  id: string;
  provider_id: string;
  service_category_id: string | null;
  date: string;
  time_slot: TimeSlot;
  base_price: number;
  recommended_price: number;
  demand_factor: number;
  supply_factor: number;
  seasonal_factor: number;
  reasoning: string | null;
  created_at: string;
}

export interface CapacityForecast {
  id: string;
  provider_id: string;
  forecast_date: string;
  available_slots: number;
  booked_slots: number;
  predicted_bookings: number;
  capacity_percentage: number;
  recommendation: CapacityRecommendation;
  created_at: string;
}

/**
 * Get scheduling preferences for provider
 */
export async function getSchedulingPreferences(
  providerId: string
): Promise<SchedulingPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('scheduling_preferences')
      .select('*')
      .eq('provider_id', providerId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: newPrefs, error: insertError } = await supabase
        .from('scheduling_preferences')
        .insert({ provider_id: providerId })
        .select()
        .single();

      if (insertError) throw insertError;
      return newPrefs;
    }

    return data;
  } catch (error) {
    console.error('Error fetching scheduling preferences:', error);
    return null;
  }
}

/**
 * Update scheduling preferences
 */
export async function updateSchedulingPreferences(
  providerId: string,
  preferences: Partial<SchedulingPreferences>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scheduling_preferences')
      .upsert({
        provider_id: providerId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating scheduling preferences:', error);
    return false;
  }
}

/**
 * Calculate optimal time slots
 */
export async function calculateOptimalTimeSlots(
  providerId: string,
  jobId: string,
  startDate: string,
  endDate: string
): Promise<TimeSlotSuggestion[]> {
  try {
    const { data, error } = await supabase.rpc('calculate_optimal_time_slots', {
      provider_id_param: providerId,
      job_id_param: jobId,
      start_date: startDate,
      end_date: endDate,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error calculating optimal time slots:', error);
    return [];
  }
}

/**
 * Get time slot suggestions
 */
export async function getTimeSlotSuggestions(
  providerId: string,
  jobId?: string
): Promise<TimeSlotSuggestion[]> {
  try {
    let query = supabase
      .from('time_slot_suggestions')
      .select('*')
      .eq('provider_id', providerId)
      .gt('expires_at', new Date().toISOString())
      .order('confidence_score', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query.limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching time slot suggestions:', error);
    return [];
  }
}

/**
 * Save time slot suggestion
 */
export async function saveTimeSlotSuggestion(
  suggestion: Partial<TimeSlotSuggestion>
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('time_slot_suggestions')
      .insert(suggestion)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving time slot suggestion:', error);
    return null;
  }
}

/**
 * Detect scheduling conflicts
 */
export async function detectSchedulingConflicts(
  providerId: string,
  checkDate: string
): Promise<SchedulingConflict[]> {
  try {
    const { data, error } = await supabase.rpc('detect_scheduling_conflicts', {
      provider_id_param: providerId,
      check_date: checkDate,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error detecting scheduling conflicts:', error);
    return [];
  }
}

/**
 * Get scheduling conflicts
 */
export async function getSchedulingConflicts(
  providerId: string,
  resolvedOnly: boolean = false
): Promise<SchedulingConflict[]> {
  try {
    let query = supabase
      .from('scheduling_conflicts')
      .select('*')
      .eq('provider_id', providerId)
      .order('detected_at', { ascending: false });

    if (!resolvedOnly) {
      query = query.eq('is_resolved', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching scheduling conflicts:', error);
    return [];
  }
}

/**
 * Resolve scheduling conflict
 */
export async function resolveSchedulingConflict(
  conflictId: string,
  resolutionMethod: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scheduling_conflicts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_method: resolutionMethod,
      })
      .eq('id', conflictId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error resolving scheduling conflict:', error);
    return false;
  }
}

/**
 * Calculate workload balance
 */
export async function calculateWorkloadBalance(
  providerId: string,
  targetDate: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_workload_balance', {
      provider_id_param: providerId,
      target_date: targetDate,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error calculating workload balance:', error);
    return 0;
  }
}

/**
 * Get workload predictions
 */
export async function getWorkloadPredictions(
  providerId: string,
  startDate: string,
  endDate: string
): Promise<WorkloadPrediction[]> {
  try {
    const { data, error } = await supabase
      .from('workload_predictions')
      .select('*')
      .eq('provider_id', providerId)
      .gte('prediction_date', startDate)
      .lte('prediction_date', endDate)
      .order('prediction_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching workload predictions:', error);
    return [];
  }
}

/**
 * Predict optimal pricing
 */
export async function predictOptimalPricing(
  providerId: string,
  categoryId: string,
  targetDate: string,
  timeSlot: TimeSlot
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('predict_optimal_pricing', {
      provider_id_param: providerId,
      category_id_param: categoryId,
      target_date: targetDate,
      time_slot_param: timeSlot,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error predicting optimal pricing:', error);
    return 0;
  }
}

/**
 * Get optimal pricing recommendations
 */
export async function getOptimalPricing(
  providerId: string,
  date: string
): Promise<OptimalPricing[]> {
  try {
    const { data, error } = await supabase
      .from('optimal_pricing')
      .select('*')
      .eq('provider_id', providerId)
      .eq('date', date)
      .order('time_slot', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching optimal pricing:', error);
    return [];
  }
}

/**
 * Learn scheduling patterns
 */
export async function learnSchedulingPatterns(providerId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('learn_scheduling_patterns', {
      provider_id_param: providerId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error learning scheduling patterns:', error);
    return false;
  }
}

/**
 * Get scheduling patterns
 */
export async function getSchedulingPatterns(
  providerId: string,
  patternType?: string
): Promise<SchedulingPattern[]> {
  try {
    let query = supabase
      .from('scheduling_patterns')
      .select('*')
      .eq('provider_id', providerId)
      .order('confidence_level', { ascending: false });

    if (patternType) {
      query = query.eq('pattern_type', patternType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching scheduling patterns:', error);
    return [];
  }
}

/**
 * Forecast capacity
 */
export async function forecastCapacity(
  providerId: string,
  daysAhead: number = 30
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('forecast_capacity', {
      provider_id_param: providerId,
      days_ahead: daysAhead,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error forecasting capacity:', error);
    return false;
  }
}

/**
 * Get capacity forecasts
 */
export async function getCapacityForecasts(
  providerId: string,
  startDate: string,
  endDate: string
): Promise<CapacityForecast[]> {
  try {
    const { data, error } = await supabase
      .from('capacity_forecasts')
      .select('*')
      .eq('provider_id', providerId)
      .gte('forecast_date', startDate)
      .lte('forecast_date', endDate)
      .order('forecast_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching capacity forecasts:', error);
    return [];
  }
}

/**
 * Get travel time between locations
 */
export async function getTravelTime(
  fromLocation: string,
  toLocation: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('travel_time_matrix')
      .select('travel_time_minutes')
      .eq('from_location', fromLocation)
      .eq('to_location', toLocation)
      .maybeSingle();

    if (error) throw error;
    return data?.travel_time_minutes || 30;
  } catch (error) {
    console.error('Error fetching travel time:', error);
    return 30;
  }
}

/**
 * Calculate confidence score for time slot
 */
export function calculateConfidenceScore(factors: {
  providerAvailable: boolean;
  withinPreferredTime: boolean;
  lowWorkload: boolean;
  noConflicts: boolean;
  optimalTravel: boolean;
}): number {
  let score = 0;

  if (factors.providerAvailable) score += 0.3;
  if (factors.withinPreferredTime) score += 0.2;
  if (factors.lowWorkload) score += 0.2;
  if (factors.noConflicts) score += 0.2;
  if (factors.optimalTravel) score += 0.1;

  return Math.min(1.0, score);
}

/**
 * Get time slot label
 */
export function getTimeSlotLabel(time: string): TimeSlot {
  const hour = parseInt(time.split(':')[0]);

  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Format confidence score
 */
export function formatConfidenceScore(score: number): string {
  if (score >= 0.8) return 'High';
  if (score >= 0.6) return 'Medium';
  return 'Low';
}

/**
 * Get confidence color
 */
export function getConfidenceColor(score: number): string {
  if (score >= 0.8) return '#10B981';
  if (score >= 0.6) return '#F59E0B';
  return '#EF4444';
}

/**
 * Calculate buffer time
 */
export function calculateBufferTime(
  preferences: SchedulingPreferences,
  includeTravel: boolean = false
): number {
  let buffer = preferences.buffer_time_minutes;

  if (includeTravel) {
    buffer += preferences.travel_time_buffer_minutes;
  }

  if (preferences.allow_back_to_back) {
    buffer = 0;
  }

  return buffer;
}

/**
 * Check if time slot is within preferred times
 */
export function isPreferredTimeSlot(
  time: string,
  preferences: SchedulingPreferences
): boolean {
  const slot = getTimeSlotLabel(time);

  switch (slot) {
    case 'morning':
      return preferences.preferred_times.morning || false;
    case 'afternoon':
      return preferences.preferred_times.afternoon || false;
    case 'evening':
      return preferences.preferred_times.evening || false;
    case 'night':
      return preferences.preferred_times.night || false;
    default:
      return false;
  }
}

/**
 * Calculate dynamic price
 */
export function calculateDynamicPrice(
  basePrice: number,
  demandFactor: number,
  supplyFactor: number,
  seasonalFactor: number,
  surgeEnabled: boolean,
  surgeMultiplier: number
): number {
  let price = basePrice * demandFactor * supplyFactor * seasonalFactor;

  if (surgeEnabled && demandFactor > 1.2) {
    price *= surgeMultiplier;
  }

  return Math.round(price * 100) / 100;
}

/**
 * Format capacity recommendation
 */
export function formatCapacityRecommendation(
  recommendation: CapacityRecommendation
): string {
  const messages = {
    expand: 'Consider expanding capacity - high demand expected',
    maintain: 'Current capacity is optimal',
    reduce: 'Consider reducing availability - low demand expected',
    block: 'Block additional bookings - at capacity',
  };
  return messages[recommendation];
}

/**
 * Get capacity color
 */
export function getCapacityColor(percentage: number): string {
  if (percentage >= 90) return '#EF4444';
  if (percentage >= 70) return '#F59E0B';
  if (percentage >= 50) return '#10B981';
  return '#6B7280';
}

/**
 * Format conflict type
 */
export function formatConflictType(type: ConflictType): string {
  const labels = {
    double_booking: 'Double Booking',
    travel_time: 'Travel Time Conflict',
    capacity: 'Capacity Exceeded',
    buffer_violation: 'Buffer Time Violation',
    availability: 'Availability Conflict',
  };
  return labels[type];
}

/**
 * Suggest conflict resolution
 */
export function suggestConflictResolution(conflict: SchedulingConflict): string[] {
  const suggestions: string[] = [];

  switch (conflict.conflict_type) {
    case 'double_booking':
      suggestions.push('Cancel one booking');
      suggestions.push('Reschedule one booking');
      suggestions.push('Add a team member');
      break;
    case 'travel_time':
      suggestions.push('Increase travel buffer');
      suggestions.push('Reschedule to allow more time');
      suggestions.push('Cancel conflicting booking');
      break;
    case 'capacity':
      suggestions.push('Reject new booking');
      suggestions.push('Increase daily capacity');
      suggestions.push('Add team member');
      break;
    case 'buffer_violation':
      suggestions.push('Add buffer time');
      suggestions.push('Reschedule booking');
      suggestions.push('Enable back-to-back bookings');
      break;
    case 'availability':
      suggestions.push('Update availability');
      suggestions.push('Reject booking');
      suggestions.push('Suggest alternative time');
      break;
  }

  return suggestions;
}
