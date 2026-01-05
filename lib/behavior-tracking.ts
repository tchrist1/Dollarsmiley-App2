import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export type EventType =
  | 'screen_view'
  | 'button_click'
  | 'form_submit'
  | 'search'
  | 'filter'
  | 'navigation'
  | 'api_call'
  | 'error'
  | 'feature_use'
  | 'purchase'
  | 'social'
  | 'booking'
  | 'message'
  | 'notification';

export interface TrackingEvent {
  eventType: EventType;
  eventCategory: string;
  eventName: string;
  eventData?: Record<string, any>;
  screenName: string;
  previousScreen?: string;
  durationMs?: number;
}

export interface UserSession {
  id: string;
  userId?: string;
  startedAt: string;
  deviceType: string;
  os: string;
  appVersion: string;
}

export interface EngagementMetrics {
  date: string;
  sessions_count: number;
  total_time_seconds: number;
  events_count: number;
  screens_viewed: number;
  features_used: string[];
  peak_activity_hour: number;
  engagement_score: number;
}

export interface BehaviorInsights {
  avg_sessions_per_day: number;
  avg_time_per_session_minutes: number;
  most_visited_screen: string;
  most_used_feature: string;
  avg_engagement_score: number;
  total_events: number;
  unique_screens: number;
  unique_features: number;
}

const SESSION_STORAGE_KEY = 'user_session_id';
const LAST_SCREEN_KEY = 'last_screen_name';
const SESSION_START_KEY = 'session_start_time';

// Initialize or get current session
export async function initializeSession(userId?: string): Promise<string> {
  try {
    // Check for existing active session
    const existingSessionId = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    const sessionStartTime = await AsyncStorage.getItem(SESSION_START_KEY);

    // If session exists and is less than 30 minutes old, reuse it
    if (existingSessionId && sessionStartTime) {
      const startTime = new Date(sessionStartTime);
      const now = new Date();
      const minutesSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60);

      if (minutesSinceStart < 30) {
        return existingSessionId;
      } else {
        // End old session
        await endSession(existingSessionId);
      }
    }

    // Create new session
    const deviceType = await getDeviceType();
    const os = Device.osName || 'Unknown';
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId || null,
        device_type: deviceType,
        os,
        app_version: appVersion,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Store session ID and start time
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, data.id);
    await AsyncStorage.setItem(SESSION_START_KEY, new Date().toISOString());

    return data.id;
  } catch (error) {
    console.error('Error initializing session:', error);
    // Return a fallback session ID
    const fallbackId = `fallback-${Date.now()}`;
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, fallbackId);
    return fallbackId;
  }
}

// Get current session ID
export async function getCurrentSessionId(): Promise<string> {
  const sessionId = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    return await initializeSession();
  }
  return sessionId;
}

// End current session
export async function endSession(sessionId?: string): Promise<void> {
  try {
    const id = sessionId || (await AsyncStorage.getItem(SESSION_STORAGE_KEY));
    if (!id) return;

    const { error } = await supabase.rpc('end_user_session', {
      p_session_id: id,
    });

    if (error) throw error;

    // Clear stored session
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    await AsyncStorage.removeItem(SESSION_START_KEY);
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

// Track event
export async function trackEvent(event: TrackingEvent): Promise<void> {
  try {
    const sessionId = await getCurrentSessionId();
    const { user } = await supabase.auth.getUser();

    const eventData = {
      user_id: user?.data?.user?.id || null,
      session_id: sessionId,
      event_type: event.eventType,
      event_category: event.eventCategory,
      event_name: event.eventName,
      event_data: event.eventData || {},
      screen_name: event.screenName,
      previous_screen: event.previousScreen,
      duration_ms: event.durationMs,
      timestamp: new Date().toISOString(),
      ip_address: 'Unknown', // Would be populated server-side in production
      user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) || 'Unknown',
      device_info: await getDeviceInfo(),
    };

    const { error } = await supabase.from('user_events').insert(eventData);

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

// Track screen view
export async function trackScreenView(
  screenName: string,
  metadata?: Record<string, any>
): Promise<void> {
  const previousScreen = await AsyncStorage.getItem(LAST_SCREEN_KEY);

  await trackEvent({
    eventType: 'screen_view',
    eventCategory: 'navigation',
    eventName: screenName,
    eventData: metadata,
    screenName,
    previousScreen: previousScreen || undefined,
  });

  await AsyncStorage.setItem(LAST_SCREEN_KEY, screenName);
}

// Track button click
export async function trackButtonClick(
  buttonName: string,
  screenName: string,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'button_click',
    eventCategory: 'interaction',
    eventName: buttonName,
    eventData: metadata,
    screenName,
  });
}

// Track form submission
export async function trackFormSubmit(
  formName: string,
  screenName: string,
  success: boolean,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'form_submit',
    eventCategory: 'conversion',
    eventName: formName,
    eventData: { success, ...metadata },
    screenName,
  });
}

// Track search
export async function trackSearch(
  query: string,
  screenName: string,
  resultsCount?: number,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'search',
    eventCategory: 'engagement',
    eventName: 'search_query',
    eventData: { query, results_count: resultsCount, ...metadata },
    screenName,
  });
}

// Track filter usage
export async function trackFilter(
  filterType: string,
  filterValue: any,
  screenName: string,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'filter',
    eventCategory: 'engagement',
    eventName: filterType,
    eventData: { value: filterValue, ...metadata },
    screenName,
  });
}

// Track feature usage
export async function trackFeatureUse(
  featureName: string,
  screenName: string,
  durationMs?: number,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'feature_use',
    eventCategory: 'feature',
    eventName: featureName,
    eventData: metadata,
    screenName,
    durationMs,
  });
}

// Track error
export async function trackError(
  errorMessage: string,
  errorCode: string,
  screenName: string,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'error',
    eventCategory: 'error',
    eventName: errorCode,
    eventData: { message: errorMessage, ...metadata },
    screenName,
  });
}

// Track booking action
export async function trackBooking(
  action: string,
  bookingId: string,
  screenName: string,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'booking',
    eventCategory: 'conversion',
    eventName: action,
    eventData: { booking_id: bookingId, ...metadata },
    screenName,
  });
}

// Track social interaction
export async function trackSocial(
  action: string,
  targetType: string,
  targetId: string,
  screenName: string,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'social',
    eventCategory: 'engagement',
    eventName: action,
    eventData: { target_type: targetType, target_id: targetId, ...metadata },
    screenName,
  });
}

// Get user engagement metrics
export async function getUserEngagementMetrics(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<EngagementMetrics[]> {
  try {
    const { data, error } = await supabase
      .from('user_engagement_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    return [];
  }
}

// Get user behavior insights
export async function getUserBehaviorInsights(
  userId: string,
  days: number = 30
): Promise<BehaviorInsights | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_behavior_insights', {
      p_user_id: userId,
      p_days: days,
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching behavior insights:', error);
    return null;
  }
}

// Update daily engagement metrics (admin/cron)
export async function updateEngagementMetrics(
  userId: string,
  date: Date
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_engagement_metrics', {
      p_user_id: userId,
      p_date: date.toISOString().split('T')[0],
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating engagement metrics:', error);
  }
}

// Update feature stats (admin/cron)
export async function updateFeatureStats(
  featureName: string,
  category: string,
  date: Date
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_feature_stats', {
      p_feature_name: featureName,
      p_category: category,
      p_date: date.toISOString().split('T')[0],
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating feature stats:', error);
  }
}

// Get feature usage stats
export async function getFeatureUsageStats(
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('feature_usage_stats')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching feature stats:', error);
    return [];
  }
}

// Get user sessions
export async function getUserSessions(
  userId: string,
  limit: number = 10
): Promise<UserSession[]> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }
}

// Helper: Get device type
async function getDeviceType(): Promise<string> {
  const deviceType = Device.deviceType;

  switch (deviceType) {
    case Device.DeviceType.PHONE:
      return 'mobile';
    case Device.DeviceType.TABLET:
      return 'tablet';
    case Device.DeviceType.DESKTOP:
      return 'desktop';
    default:
      return 'unknown';
  }
}

// Helper: Get device info
async function getDeviceInfo(): Promise<Record<string, any>> {
  return {
    brand: Device.brand,
    manufacturer: Device.manufacturer,
    modelName: Device.modelName,
    deviceType: await getDeviceType(),
    osName: Device.osName,
    osVersion: Device.osVersion,
    platformApiLevel: Device.platformApiLevel,
  };
}

// Helper: Format engagement score
export function formatEngagementScore(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

// Helper: Get engagement color
export function getEngagementColor(score: number): string {
  if (score >= 80) return '#059669'; // Green
  if (score >= 60) return '#10B981'; // Light green
  if (score >= 40) return '#F59E0B'; // Yellow
  if (score >= 20) return '#F97316'; // Orange
  return '#EF4444'; // Red
}

// Helper: Format duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

// Helper: Format event type
export function formatEventType(eventType: EventType): string {
  const labels: Record<EventType, string> = {
    screen_view: 'Screen View',
    button_click: 'Button Click',
    form_submit: 'Form Submit',
    search: 'Search',
    filter: 'Filter',
    navigation: 'Navigation',
    api_call: 'API Call',
    error: 'Error',
    feature_use: 'Feature Use',
    purchase: 'Purchase',
    social: 'Social',
    booking: 'Booking',
    message: 'Message',
    notification: 'Notification',
  };
  return labels[eventType] || eventType;
}

// Cleanup old events (admin/cron)
export async function cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { count, error } = await supabase
      .from('user_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error cleaning up old events:', error);
    return 0;
  }
}
