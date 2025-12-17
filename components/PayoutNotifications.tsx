import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PayoutNotificationService } from '@/lib/payout-notifications';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  TrendingUp,
} from 'lucide-react-native';

export default function PayoutNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  async function loadNotifications() {
    if (!user) return;

    setLoading(true);
    const data = await PayoutNotificationService.getPayoutNotifications(user.id, 10);
    setNotifications(data);
    setLoading(false);
  }

  async function handleNotificationPress(notification: any) {
    if (!notification.is_read) {
      await PayoutNotificationService.markNotificationAsRead(notification.id);
      loadNotifications();
    }

    if (notification.data?.payout_schedule_id) {
      router.push('/provider/payout-dashboard' as any);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'payout_scheduled':
        return <Clock size={20} color={colors.info} />;
      case 'payout_processing':
        return <TrendingUp size={20} color={colors.warning} />;
      case 'payout_completed':
        return <CheckCircle size={20} color={colors.success} />;
      case 'payout_failed':
        return <AlertCircle size={20} color={colors.error} />;
      case 'early_payout_eligible':
      case 'early_payout_approved':
        return <Zap size={20} color={colors.primary} />;
      default:
        return <DollarSign size={20} color={colors.textSecondary} />;
    }
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <DollarSign size={48} color={colors.textLight} />
        <Text style={styles.emptyText}>No payout notifications</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payout Updates</Text>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.is_read && styles.notificationUnread,
            ]}
            onPress={() => handleNotificationPress(notification)}
          >
            <View style={styles.iconContainer}>
              {getNotificationIcon(notification.type)}
            </View>

            <View style={styles.content}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(notification.created_at)}
              </Text>
            </View>

            {!notification.is_read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  list: {
    maxHeight: 400,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  notificationUnread: {
    backgroundColor: colors.primaryLight,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  notificationMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
});
