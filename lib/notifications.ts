import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    return null;
  }

  try {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    console.log('Push notifications not available in Expo Go. Use development build for full functionality.');
    return null;
  }
}

export async function savePushToken(userId: string, token: string) {
  if (!token) return;

  const deviceType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: userId,
      token,
      device_type: deviceType,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'token',
    });

  if (error) {
    console.error('Error saving push token:', error);
  }
}

export async function removePushToken(token: string) {
  if (!token) return;

  const { error } = await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('token', token);

  if (error) {
    console.error('Error removing push token:', error);
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

export function setupNotificationResponseListener(
  handleNotificationResponse: (notification: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
}

export interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

/**
 * Get notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<NotificationData[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Subscribe to real-time notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: NotificationData) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as NotificationData;
        onNotification(notification);

        // Show local notification on mobile
        if (Platform.OS !== 'web') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title,
              body: notification.message,
              data: { notificationId: notification.id, ...notification.data },
            },
            trigger: null,
          });
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to notification updates (read status changes)
 */
export function subscribeToNotificationUpdates(
  userId: string,
  onUpdate: (notification: NotificationData) => void
) {
  const channel = supabase
    .channel(`notification_updates:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as NotificationData;
        onUpdate(notification);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
}

/**
 * Create a notification (for testing or manual creation)
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    data: data || {},
  });

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get notification type icon name
 */
export function getNotificationIcon(type: string): string {
  const iconMap: Record<string, string> = {
    Booking: 'calendar',
    Payment: 'credit-card',
    Message: 'message-circle',
    Review: 'star',
    Verification: 'shield-check',
    System: 'bell',
    Dispute: 'alert-triangle',
    Payout: 'dollar-sign',
    default: 'bell',
  };

  return iconMap[type] || iconMap.default;
}

/**
 * Get notification type color
 */
export function getNotificationColor(type: string): string {
  const colorMap: Record<string, string> = {
    Booking: '#007AFF',
    Payment: '#34C759',
    Message: '#5856D6',
    Review: '#FF9500',
    Verification: '#00C7BE',
    System: '#8E8E93',
    Dispute: '#FF3B30',
    Payout: '#34C759',
  };

  return colorMap[type] || '#8E8E93';
}

/**
 * Format notification time (relative time)
 */
export function formatNotificationTime(createdAt: string): string {
  const now = new Date();
  const notificationDate = new Date(createdAt);
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return notificationDate.toLocaleDateString();
}

/**
 * Get badge count for app icon
 */
export async function updateBadgeCount(userId: string) {
  if (Platform.OS === 'web') return;

  const count = await getUnreadNotificationCount(userId);
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge count
 */
export async function clearBadgeCount() {
  if (Platform.OS === 'web') return;

  await Notifications.setBadgeCountAsync(0);
}
