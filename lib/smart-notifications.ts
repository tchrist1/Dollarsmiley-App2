import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app';

export type FrequencyPreference = 'instant' | 'hourly' | 'daily' | 'weekly' | 'custom';

export type NotificationCategory =
  | 'booking'
  | 'message'
  | 'payment'
  | 'review'
  | 'recommendation'
  | 'promotion'
  | 'system'
  | 'social'
  | 'achievement';

export type SuggestionType =
  | 're_engagement'
  | 'abandoned_booking'
  | 'review_reminder'
  | 'price_drop'
  | 'new_match'
  | 'inactive_booking'
  | 'provider_available'
  | 'trending_nearby'
  | 'achievement_unlock'
  | 'referral_opportunity';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  channel_preferences: Record<NotificationChannel, boolean>;
  frequency_preference: FrequencyPreference;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  categories_enabled: NotificationCategory[];
  smart_suggestions_enabled: boolean;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  category: NotificationCategory;
  type: 'instant' | 'digest' | 'reminder' | 'suggestion' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title_template: string;
  body_template: string;
  action_url_template?: string;
  icon?: string;
  enabled: boolean;
}

export interface NotificationSuggestion {
  id: string;
  user_id: string;
  suggestion_type: SuggestionType;
  priority_score: number;
  context_data: Record<string, any>;
  notification_template_id?: string;
  status: 'pending' | 'sent' | 'dismissed' | 'expired' | 'cancelled';
  suggested_send_time: string;
  sent_at?: string;
  expires_at: string;
  created_at: string;
}

export interface EngagementMetrics {
  opened: boolean;
  clicked: boolean;
  dismissed: boolean;
  action_taken?: string;
  time_to_open_seconds?: number;
  opened_at?: string;
  clicked_at?: string;
  dismissed_at?: string;
}

// Get user notification preferences
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    // Create default preferences if none exist
    if (!data) {
      const { data: newPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) throw insertError;
      return newPrefs;
    }

    return data;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: error.message };
  }
}

// Create a smart notification suggestion
export async function createNotificationSuggestion(
  userId: string,
  suggestionType: SuggestionType,
  contextData: Record<string, any>,
  templateId?: string,
  expiresInHours: number = 24
): Promise<{ success: boolean; suggestionId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_notification_suggestion', {
      p_user_id: userId,
      p_suggestion_type: suggestionType,
      p_context_data: contextData,
      p_template_id: templateId,
      p_expires_in_hours: expiresInHours,
    });

    if (error) throw error;

    return { success: true, suggestionId: data };
  } catch (error: any) {
    console.error('Error creating notification suggestion:', error);
    return { success: false, error: error.message };
  }
}

// Get user's notification suggestions
export async function getNotificationSuggestions(
  userId: string,
  status?: 'pending' | 'sent' | 'dismissed' | 'expired'
): Promise<NotificationSuggestion[]> {
  try {
    let query = supabase
      .from('notification_suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('priority_score', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notification suggestions:', error);
    return [];
  }
}

// Dismiss a notification suggestion
export async function dismissNotificationSuggestion(
  suggestionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notification_suggestions')
      .update({ status: 'dismissed', updated_at: new Date().toISOString() })
      .eq('id', suggestionId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error dismissing suggestion:', error);
    return { success: false, error: error.message };
  }
}

// Mark suggestion as sent
export async function markSuggestionSent(
  suggestionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notification_suggestions')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error marking suggestion as sent:', error);
    return { success: false, error: error.message };
  }
}

// Record notification engagement
export async function recordNotificationEngagement(
  notificationId: string,
  userId: string,
  action: 'open' | 'click' | 'dismiss'
): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.rpc('record_notification_engagement', {
      p_notification_id: notificationId,
      p_user_id: userId,
      p_action: action,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error recording engagement:', error);
    return { success: false, error: error.message };
  }
}

// Get engagement metrics for a notification
export async function getNotificationEngagement(
  notificationId: string
): Promise<EngagementMetrics | null> {
  try {
    const { data, error } = await supabase
      .from('notification_engagement_metrics')
      .select('*')
      .eq('notification_id', notificationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    return null;
  }
}

// Get user's engagement statistics
export async function getUserEngagementStats(
  userId: string,
  days: number = 30
): Promise<{
  total_notifications: number;
  opened_count: number;
  clicked_count: number;
  dismissed_count: number;
  open_rate: number;
  click_rate: number;
  avg_time_to_open_seconds: number;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('notification_engagement_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString());

    if (error) throw error;

    const total = data?.length || 0;
    const opened = data?.filter((m) => m.opened).length || 0;
    const clicked = data?.filter((m) => m.clicked).length || 0;
    const dismissed = data?.filter((m) => m.dismissed).length || 0;

    const times = data?.filter((m) => m.time_to_open_seconds).map((m) => m.time_to_open_seconds);
    const avgTime = times && times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;

    return {
      total_notifications: total,
      opened_count: opened,
      clicked_count: clicked,
      dismissed_count: dismissed,
      open_rate: total > 0 ? (opened / total) * 100 : 0,
      click_rate: total > 0 ? (clicked / total) * 100 : 0,
      avg_time_to_open_seconds: avgTime,
    };
  } catch (error) {
    console.error('Error fetching engagement stats:', error);
    return {
      total_notifications: 0,
      opened_count: 0,
      clicked_count: 0,
      dismissed_count: 0,
      open_rate: 0,
      click_rate: 0,
      avg_time_to_open_seconds: 0,
    };
  }
}

// Check if user should receive notification based on preferences
export async function shouldSendNotification(
  userId: string,
  category: NotificationCategory,
  channel: NotificationChannel
): Promise<boolean> {
  try {
    const prefs = await getNotificationPreferences(userId);
    if (!prefs) return true; // Default to sending if no preferences

    // Check if category is enabled
    if (!prefs.categories_enabled.includes(category)) {
      return false;
    }

    // Check if channel is enabled
    if (!prefs.channel_preferences[channel]) {
      return false;
    }

    // Check quiet hours
    if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);

      if (currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return true; // Default to sending on error
  }
}

// Generate suggestion for abandoned booking
export async function suggestAbandonedBookingNotification(
  userId: string,
  bookingData: Record<string, any>
): Promise<{ success: boolean; suggestionId?: string }> {
  const contextData = {
    booking_id: bookingData.id,
    provider_name: bookingData.provider_name,
    service_name: bookingData.service_name,
    hours_since_action: bookingData.hours_since_created,
  };

  return await createNotificationSuggestion(
    userId,
    'abandoned_booking',
    contextData,
    undefined,
    48 // Expires in 48 hours
  );
}

// Generate suggestion for review reminder
export async function suggestReviewReminderNotification(
  userId: string,
  bookingData: Record<string, any>
): Promise<{ success: boolean; suggestionId?: string }> {
  const contextData = {
    booking_id: bookingData.id,
    provider_name: bookingData.provider_name,
    completed_at: bookingData.completed_at,
    days_since_completion: bookingData.days_since_completion,
  };

  return await createNotificationSuggestion(
    userId,
    'review_reminder',
    contextData,
    undefined,
    72 // Expires in 72 hours
  );
}

// Generate suggestion for new match
export async function suggestNewMatchNotification(
  userId: string,
  providerData: Record<string, any>
): Promise<{ success: boolean; suggestionId?: string }> {
  const contextData = {
    provider_id: providerData.id,
    provider_name: providerData.name,
    category: providerData.category,
    match_score: providerData.match_score,
  };

  return await createNotificationSuggestion(
    userId,
    'new_match',
    contextData,
    undefined,
    24 // Expires in 24 hours
  );
}

// Generate suggestion for re-engagement
export async function suggestReEngagementNotification(
  userId: string,
  inactiveDays: number
): Promise<{ success: boolean; suggestionId?: string }> {
  const contextData = {
    inactive_days: inactiveDays,
    last_activity: new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString(),
  };

  return await createNotificationSuggestion(
    userId,
    're_engagement',
    contextData,
    undefined,
    72 // Expires in 72 hours
  );
}

// Clean expired suggestions
export async function cleanExpiredSuggestions(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('clean_expired_notification_suggestions');

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error cleaning expired suggestions:', error);
    return 0;
  }
}

// Helper: Format suggestion type for display
export function formatSuggestionType(type: SuggestionType): string {
  const labels: Record<SuggestionType, string> = {
    re_engagement: 'We miss you!',
    abandoned_booking: 'Complete your booking',
    review_reminder: 'Share your experience',
    price_drop: 'Price drop alert',
    new_match: 'New match found',
    inactive_booking: 'Booking needs attention',
    provider_available: 'Provider is available',
    trending_nearby: 'Trending near you',
    achievement_unlock: 'Achievement unlocked',
    referral_opportunity: 'Earn rewards',
  };
  return labels[type] || type;
}

// Helper: Get priority color
export function getPriorityColor(score: number): string {
  if (score >= 80) return '#EF4444'; // Red - Urgent
  if (score >= 60) return '#F59E0B'; // Orange - High
  if (score >= 40) return '#10B981'; // Green - Medium
  return '#6B7280'; // Gray - Low
}

// Helper: Get priority label
export function getPriorityLabel(score: number): string {
  if (score >= 80) return 'Urgent';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

// Helper: Format time until send
export function formatTimeUntilSend(suggestedTime: string): string {
  const now = new Date();
  const send = new Date(suggestedTime);
  const diff = send.getTime() - now.getTime();

  if (diff < 0) return 'Now';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) return `${minutes}m`;
  if (hours < 24) return `${hours}h ${minutes}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
