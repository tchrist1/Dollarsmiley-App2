import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotifications,
  subscribeToNotifications,
  subscribeToNotificationUpdates,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationColor,
  formatNotificationTime,
  updateBadgeCount,
  registerForPushNotificationsAsync,
  savePushToken,
  type NotificationData,
} from '@/lib/notifications';
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  CreditCard,
  MessageCircle,
  Star,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import type { RealtimeChannel } from '@supabase/supabase-js';

const NotificationIconMap: Record<string, any> = {
  Booking: Calendar,
  Payment: CreditCard,
  Message: MessageCircle,
  Review: Star,
  Verification: ShieldCheck,
  System: Bell,
  Dispute: AlertTriangle,
  Payout: DollarSign,
};

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const notificationChannel = useRef<RealtimeChannel | null>(null);
  const updateChannel = useRef<RealtimeChannel | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (profile && !isInitialized.current) {
      isInitialized.current = true;
      setupNotifications();
    }

    return () => {
      cleanup();
    };
  }, [profile?.id]);

  const setupNotifications = async () => {
    if (!profile) return;

    // Request notification permissions and register push token
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await savePushToken(profile.id, token);
    }

    // Load initial notifications
    await fetchNotifications();

    // Subscribe to real-time updates
    setupRealtimeSubscriptions();

    // Update badge count
    await updateBadgeCount(profile.id);
  };

  const setupRealtimeSubscriptions = () => {
    if (!profile) return;

    // Subscribe to new notifications
    notificationChannel.current = subscribeToNotifications(profile.id, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      updateBadgeCount(profile.id);
    });

    // Subscribe to notification updates
    updateChannel.current = subscribeToNotificationUpdates(profile.id, (notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? notification : n))
      );
      updateBadgeCount(profile.id);
    });
  };

  const cleanup = () => {
    if (notificationChannel.current) {
      notificationChannel.current.unsubscribe();
    }
    if (updateChannel.current) {
      updateChannel.current.unsubscribe();
    }
  };

  const fetchNotifications = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      const data = await getNotifications(profile.id, 50);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );

      if (profile) {
        await updateBadgeCount(profile.id);
      }
    }

    // Handle navigation based on notification data
    if (notification.data?.action_url) {
      router.push(notification.data.action_url);
    } else if (notification.data?.bookingId) {
      router.push(`/booking/${notification.data.bookingId}` as any);
    } else if (notification.data?.chatId) {
      router.push(`/chat/${notification.data.chatId}` as any);
    }
  };

  const handleMarkAllRead = async () => {
    if (!profile) return;

    try {
      await markAllNotificationsAsRead(profile.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await updateBadgeCount(profile.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotification(notificationId);
              setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

              if (profile) {
                await updateBadgeCount(profile.id);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = async () => {
    if (!profile) return;

    Alert.alert(
      'Delete All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllNotifications(profile.id);
              setNotifications([]);
              await updateBadgeCount(profile.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete notifications');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getNotificationIcon = (type: string) => {
    const IconComponent = NotificationIconMap[type] || Bell;
    const iconColor = getNotificationColor(type);
    return <IconComponent size={20} color={iconColor} />;
  };

  const renderNotification = ({ item }: { item: NotificationData }) => (
    <View style={styles.notificationWrapper}>
      <TouchableOpacity
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getNotificationColor(item.type) + '20' },
          ]}
        >
          {getNotificationIcon(item.type)}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.body} numberOfLines={2}>
            {item.message}
          </Text>

          <Text style={styles.timestamp}>{formatNotificationTime(item.created_at)}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNotification(item.id)}
      >
        <Trash2 size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread</Text>
          )}
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
              <CheckCheck size={18} color={colors.primary} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}

          {notifications.length > 0 && (
            <TouchableOpacity style={styles.deleteAllButton} onPress={handleDeleteAll}>
              <Trash2 size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              You'll see booking updates, messages, and important alerts here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  unreadCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  markAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  deleteAllButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notificationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  notificationCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  unreadCard: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
});
