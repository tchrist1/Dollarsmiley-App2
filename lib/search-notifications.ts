import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPriority = 'default' | 'high' | 'max';

export interface SearchNotificationPayload {
  searchId: string;
  searchName: string;
  matchCount: number;
  matchIds: string[];
  notificationType: 'new_matches' | 'price_drop' | 'availability' | 'trending';
}

export interface NotificationPreferences {
  search_alerts: boolean;
  new_matches: boolean;
  price_alerts: boolean;
  availability_alerts: boolean;
  trending_alerts: boolean;
  instant_notifications: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

// Get notification permissions status
export async function getNotificationPermissions(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      return 'denied';
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    console.error('Error getting notification permissions:', error);
    return 'undetermined';
  }
}

// Register for push notifications
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

// Save push token to database
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

// Send local notification
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any,
  priority: NotificationPriority = 'default'
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: priority,
      },
      trigger: null, // Send immediately
    });

    return notificationId;
  } catch (error) {
    console.error('Error sending local notification:', error);
    return null;
  }
}

// Send new matches notification
export async function sendNewMatchesNotification(
  searchName: string,
  matchCount: number,
  searchId: string
): Promise<void> {
  const title = 'New matches found! 🎯';
  const body = `${matchCount} new ${matchCount === 1 ? 'match' : 'matches'} for "${searchName}"`;

  await sendLocalNotification(title, body, {
    type: 'new_matches',
    searchId,
    matchCount,
  });
}

// Send price drop notification
export async function sendPriceDropNotification(
  itemName: string,
  oldPrice: number,
  newPrice: number,
  itemId: string
): Promise<void> {
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  const title = 'Price Drop Alert! 💰';
  const body = `${itemName} dropped ${discount}% to $${newPrice}`;

  await sendLocalNotification(title, body, {
    type: 'price_drop',
    itemId,
    oldPrice,
    newPrice,
  }, 'high');
}

// Send availability notification
export async function sendAvailabilityNotification(
  providerName: string,
  providerId: string
): Promise<void> {
  const title = 'Provider Available! 📅';
  const body = `${providerName} has new availability`;

  await sendLocalNotification(title, body, {
    type: 'availability',
    providerId,
  });
}

// Send trending notification
export async function sendTrendingNotification(
  query: string,
  trendScore: number
): Promise<void> {
  const title = 'Trending Now! 🔥';
  const body = `"${query}" is trending in your area`;

  await sendLocalNotification(title, body, {
    type: 'trending',
    query,
    trendScore,
  });
}

// Get notification preferences
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    return data?.notification_preferences || {
      search_alerts: true,
      new_matches: true,
      price_alerts: true,
      availability_alerts: true,
      trending_alerts: false,
      instant_notifications: true,
      daily_digest: false,
      weekly_digest: false,
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return null;
  }
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentPrefs = await getNotificationPreferences(userId);
    const newPrefs = { ...currentPrefs, ...preferences };

    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: newPrefs })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: error.message };
  }
}

// Check if in quiet hours
export function isInQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();

  const start = preferences.quiet_hours_start;
  const end = preferences.quiet_hours_end;

  if (start < end) {
    return currentHour >= start && currentHour < end;
  } else {
    return currentHour >= start || currentHour < end;
  }
}

// Get saved search notifications
export async function getSavedSearchNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<any[]> {
  try {
    let query = supabase
      .from('saved_search_notifications')
      .select(`
        *,
        saved_search:saved_searches(name, search_type)
      `)
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    if (unreadOnly) {
      query = query.is('opened_at', null);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting saved search notifications:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_search_notifications')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_search_notifications')
      .update({ opened_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('opened_at', null);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('saved_search_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('opened_at', null);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

// Subscribe to real-time notifications
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: any) => void
): () => void {
  const subscription = supabase
    .channel('saved_search_notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'saved_search_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

// Process notification based on preferences
export async function processNotification(
  userId: string,
  notificationType: string,
  data: any
): Promise<boolean> {
  try {
    const preferences = await getNotificationPreferences(userId);
    if (!preferences) return false;

    // Check if search alerts are enabled
    if (!preferences.search_alerts) return false;

    // Check specific notification type
    switch (notificationType) {
      case 'new_matches':
        if (!preferences.new_matches) return false;
        break;
      case 'price_drop':
        if (!preferences.price_alerts) return false;
        break;
      case 'availability':
        if (!preferences.availability_alerts) return false;
        break;
      case 'trending':
        if (!preferences.trending_alerts) return false;
        break;
    }

    // Check quiet hours
    if (isInQuietHours(preferences)) {
      console.log('In quiet hours, skipping notification');
      return false;
    }

    // Check notification frequency
    if (!preferences.instant_notifications) {
      console.log('Instant notifications disabled, queuing for digest');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error processing notification:', error);
    return false;
  }
}

// Create daily digest
export async function createDailyDigest(userId: string): Promise<any> {
  try {
    // Get all unread notifications from the last 24 hours
    const { data: notifications, error } = await supabase
      .from('saved_search_notifications')
      .select(`
        *,
        saved_search:saved_searches(name, search_type)
      `)
      .eq('user_id', userId)
      .is('opened_at', null)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const digest = {
      date: new Date().toISOString(),
      total_notifications: notifications?.length || 0,
      by_type: {} as Record<string, number>,
      by_search: {} as Record<string, any>,
      total_new_matches: 0,
    };

    notifications?.forEach((notif) => {
      const searchName = notif.saved_search?.name || 'Unknown';

      // Count by search
      if (!digest.by_search[searchName]) {
        digest.by_search[searchName] = {
          count: 0,
          matches: 0,
        };
      }
      digest.by_search[searchName].count++;
      digest.by_search[searchName].matches += notif.new_matches_count;

      digest.total_new_matches += notif.new_matches_count;
    });

    return digest;
  } catch (error) {
    console.error('Error creating daily digest:', error);
    return null;
  }
}

// Send daily digest notification
export async function sendDailyDigest(userId: string): Promise<void> {
  try {
    const digest = await createDailyDigest(userId);
    if (!digest || digest.total_notifications === 0) {
      return;
    }

    const title = 'Your Daily Search Digest 📊';
    const body = `${digest.total_new_matches} new matches across ${digest.total_notifications} searches`;

    await sendLocalNotification(title, body, {
      type: 'daily_digest',
      digest,
    });
  } catch (error) {
    console.error('Error sending daily digest:', error);
  }
}

// Get notification badge count
export async function getNotificationBadgeCount(userId: string): Promise<number> {
  try {
    const count = await getUnreadNotificationCount(userId);

    if (Platform.OS !== 'web') {
      await Notifications.setBadgeCountAsync(count);
    }

    return count;
  } catch (error) {
    console.error('Error getting notification badge count:', error);
    return 0;
  }
}

// Clear notification badge
export async function clearNotificationBadge(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await Notifications.setBadgeCountAsync(0);
    }
  } catch (error) {
    console.error('Error clearing notification badge:', error);
  }
}

// Handle notification tap
export function handleNotificationTap(
  notification: Notifications.Notification,
  onNavigate: (route: string, params?: any) => void
): void {
  const data = notification.request.content.data;

  switch (data?.type) {
    case 'new_matches':
      onNavigate('/search-results', { searchId: data.searchId });
      break;
    case 'price_drop':
      onNavigate('/listing', { id: data.itemId });
      break;
    case 'availability':
      onNavigate('/profile', { id: data.providerId });
      break;
    case 'trending':
      onNavigate('/search', { query: data.query });
      break;
    case 'daily_digest':
      onNavigate('/notifications');
      break;
  }
}

// Setup notification listeners
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (response: Notifications.NotificationResponse) => void
): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const receivedListener = Notifications.addNotificationReceivedListener(
    onNotificationReceived
  );

  const responseListener = Notifications.addNotificationResponseReceivedListener(
    onNotificationTapped
  );

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
}

// Format notification time
export function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// Get notification icon
export function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    new_matches: '🎯',
    price_drop: '💰',
    availability: '📅',
    trending: '🔥',
    daily_digest: '📊',
  };
  return icons[type] || '🔔';
}

// Schedule quiet hours
export async function scheduleQuietHours(
  startHour: number,
  endHour: number,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateNotificationPreferences(userId, {
      quiet_hours_start: startHour,
      quiet_hours_end: endHour,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error scheduling quiet hours:', error);
    return { success: false, error: error.message };
  }
}
