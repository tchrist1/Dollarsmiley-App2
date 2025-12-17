import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

interface PushNotificationData {
  type?: string;
  id?: string;
  [key: string]: any;
}

export class PushNotificationService {
  static async registerForPushNotifications(userId: string): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      await this.savePushToken(userId, token.data, Platform.OS);

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  static async savePushToken(
    userId: string,
    token: string,
    platform: string
  ): Promise<void> {
    const deviceType = platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'web';

    const { error } = await supabase.rpc('register_push_token', {
      user_id_param: userId,
      token_param: token,
      device_type_param: deviceType,
      device_name_param: Device.modelName || 'Unknown',
    });

    if (error) {
      console.error('Error saving push token:', error);
      throw error;
    }
  }

  static async removePushToken(token: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('token', token);

    if (error) throw error;
  }

  static async getUserPushTokens(userId: string) {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  static async queueNotification(
    userId: string,
    title: string,
    body: string,
    data?: PushNotificationData,
    scheduledFor?: Date
  ): Promise<string> {
    const { data: queueId, error } = await supabase.rpc('queue_push_notification', {
      user_id_param: userId,
      title_param: title,
      body_param: body,
      data_param: data || {},
      scheduled_for_param: scheduledFor?.toISOString() || new Date().toISOString(),
    });

    if (error) throw error;
    return queueId;
  }

  static setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  static addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  static async sendLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationData,
    seconds: number = 0
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: seconds > 0 ? { seconds } : null,
    });

    return notificationId;
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  static async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  static async dismissNotification(notificationId: string): Promise<void> {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  static async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  static async getPresentedNotifications(): Promise<Notifications.Notification[]> {
    return await Notifications.getPresentedNotificationsAsync();
  }

  static getNotificationCategories() {
    return {
      BOOKING: 'booking',
      MESSAGE: 'message',
      PAYMENT: 'payment',
      REVIEW: 'review',
      DELIVERY: 'delivery',
      REMINDER: 'reminder',
      MARKETING: 'marketing',
      SYSTEM: 'system',
    };
  }

  static async scheduleBookingReminder(
    userId: string,
    bookingId: string,
    title: string,
    body: string,
    scheduledTime: Date
  ): Promise<string> {
    return this.queueNotification(
      userId,
      title,
      body,
      {
        type: 'booking_reminder',
        bookingId,
      },
      scheduledTime
    );
  }

  static async scheduleDeliveryUpdate(
    userId: string,
    shipmentId: string,
    status: string,
    message: string
  ): Promise<string> {
    return this.queueNotification(
      userId,
      'Delivery Update',
      message,
      {
        type: 'delivery_update',
        shipmentId,
        status,
      }
    );
  }

  static async notifyNewMessage(
    userId: string,
    senderName: string,
    conversationId: string
  ): Promise<string> {
    return this.queueNotification(
      userId,
      'New Message',
      `${senderName} sent you a message`,
      {
        type: 'new_message',
        conversationId,
      }
    );
  }

  static async notifyPaymentReceived(
    userId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<string> {
    return this.queueNotification(
      userId,
      'Payment Received',
      `You received ${currency} ${amount.toFixed(2)}`,
      {
        type: 'payment_received',
        amount,
        currency,
      }
    );
  }

  static async notifyBookingStatusChange(
    userId: string,
    bookingId: string,
    status: string,
    message: string
  ): Promise<string> {
    return this.queueNotification(
      userId,
      'Booking Update',
      message,
      {
        type: 'booking_status',
        bookingId,
        status,
      }
    );
  }

  static async getQueuedNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'sending'])
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getNotificationStats(userId: string) {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', userId);

    const { data: queued } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');

    const { data: sent } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'sent')
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    return {
      activeDevices: tokens?.filter(t => t.is_active).length || 0,
      totalDevices: tokens?.length || 0,
      pendingNotifications: queued?.length || 0,
      sentThisWeek: sent?.length || 0,
    };
  }

  static async testNotification(userId: string): Promise<void> {
    await this.queueNotification(
      userId,
      'Test Notification',
      'This is a test notification from DollarSmiley!',
      {
        type: 'test',
        timestamp: new Date().toISOString(),
      }
    );
  }
}

export default PushNotificationService;
