import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Repeat,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Pause,
  Play,
  Trash2,
} from 'lucide-react-native';
import {
  type RecurringBooking,
  formatRecurrencePattern,
  getDayName,
} from '@/lib/recurring-bookings';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RecurringBookingDetailsProps {
  recurringId: string;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
}

interface BookingInstance {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
}

export default function RecurringBookingDetails({
  recurringId,
  onPause,
  onResume,
  onCancel,
  onEdit,
}: RecurringBookingDetailsProps) {
  const [recurring, setRecurring] = useState<RecurringBooking | null>(null);
  const [instances, setInstances] = useState<BookingInstance[]>([]);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [recurringId]);

  const loadDetails = async () => {
    try {
      // Load recurring booking
      const { data: recurringData, error: recurringError } = await supabase
        .from('recurring_bookings')
        .select('*')
        .eq('id', recurringId)
        .single();

      if (recurringError) throw recurringError;
      setRecurring(recurringData);

      // Load provider
      const { data: providerData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', recurringData.provider_id)
        .single();

      setProvider(providerData);

      // Load created bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, booking_date, booking_time, status, total_price')
        .eq('recurring_booking_id', recurringId)
        .order('booking_date', { ascending: true });

      setInstances(bookingsData || []);
    } catch (error) {
      console.error('Error loading details:', error);
      Alert.alert('Error', 'Failed to load recurring booking details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStats = () => {
    const total = instances.length;
    const completed = instances.filter(i => i.status === 'completed').length;
    const upcoming = instances.filter(i =>
      ['pending', 'confirmed'].includes(i.status)
    ).length;
    const cancelled = instances.filter(i =>
      ['cancelled', 'rejected'].includes(i.status)
    ).length;

    return { total, completed, upcoming, cancelled };
  };

  const getTotalSpent = () => {
    return instances
      .filter(i => i.status === 'completed')
      .reduce((sum, i) => sum + i.total_price, 0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color={colors.success} />;
      case 'cancelled':
      case 'rejected':
        return <XCircle size={16} color={colors.error} />;
      case 'confirmed':
        return <CheckCircle size={16} color={colors.primary} />;
      default:
        return <Clock size={16} color={colors.warning} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'cancelled':
      case 'rejected':
        return colors.error;
      case 'confirmed':
        return colors.primary;
      default:
        return colors.warning;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!recurring) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Recurring booking not found</Text>
      </View>
    );
  }

  const stats = getStatusStats();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: recurring.is_active ? colors.success : colors.textSecondary },
              ]}
            />
            <Text style={styles.headerTitle}>{recurring.service_title}</Text>
          </View>
          <Text style={styles.priceText}>${recurring.service_price}</Text>
        </View>

        {provider && (
          <View style={styles.providerInfo}>
            <User size={16} color={colors.textSecondary} />
            <Text style={styles.providerName}>{provider.full_name}</Text>
          </View>
        )}

        <View style={styles.scheduleInfo}>
          <View style={styles.scheduleItem}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={styles.scheduleText}>
              Started {new Date(recurring.start_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.scheduleItem}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.scheduleText}>
              {recurring.start_time} ({recurring.duration_minutes} min)
            </Text>
          </View>
        </View>

        <View style={styles.patternCard}>
          <Repeat size={18} color={colors.primary} />
          <Text style={styles.patternText}>
            {formatRecurrencePattern(recurring.recurrence_pattern)}
          </Text>
        </View>

        {recurring.next_booking_date && recurring.is_active && (
          <View style={styles.nextBookingCard}>
            <AlertCircle size={18} color={colors.primary} />
            <View style={styles.nextBookingInfo}>
              <Text style={styles.nextBookingLabel}>Next Booking</Text>
              <Text style={styles.nextBookingDate}>
                {new Date(recurring.next_booking_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.error }]}>{stats.cancelled}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
        </View>

        <View style={styles.totalSpent}>
          <DollarSign size={20} color={colors.success} />
          <View style={styles.totalSpentInfo}>
            <Text style={styles.totalSpentLabel}>Total Spent</Text>
            <Text style={styles.totalSpentValue}>${getTotalSpent().toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Actions Card */}
      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Manage Recurring Booking</Text>
        <View style={styles.actionsGrid}>
          {recurring.is_active ? (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={onPause}>
                <Pause size={20} color={colors.warning} />
                <Text style={[styles.actionButtonText, { color: colors.warning }]}>Pause</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onCancel}>
                <Trash2 size={20} color={colors.error} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>Stop</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={onResume}>
              <Play size={20} color={colors.success} />
              <Text style={[styles.actionButtonText, { color: colors.success }]}>Resume</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Booking History */}
      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Booking History</Text>
        {instances.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Calendar size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No bookings created yet</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {instances.map(instance => (
              <View key={instance.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <View style={styles.historyDate}>
                    <Text style={styles.historyDateDay}>
                      {new Date(instance.booking_date).getDate()}
                    </Text>
                    <Text style={styles.historyDateMonth}>
                      {new Date(instance.booking_date).toLocaleDateString('en-US', {
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTime}>{instance.booking_time}</Text>
                    <Text style={styles.historyDay}>
                      {getDayName(new Date(instance.booking_date).getDay())}
                    </Text>
                  </View>
                </View>

                <View style={styles.historyRight}>
                  <View
                    style={[
                      styles.historyStatus,
                      { backgroundColor: getStatusColor(instance.status) + '20' },
                    ]}
                  >
                    {getStatusIcon(instance.status)}
                    <Text
                      style={[
                        styles.historyStatusText,
                        { color: getStatusColor(instance.status) },
                      ]}
                    >
                      {getStatusLabel(instance.status)}
                    </Text>
                  </View>
                  <Text style={styles.historyPrice}>${instance.total_price}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
  },
  headerCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  priceText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  providerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  scheduleInfo: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scheduleText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  patternText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  nextBookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '10',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  nextBookingInfo: {
    flex: 1,
  },
  nextBookingLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  nextBookingDate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statsCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  totalSpent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '10',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  totalSpentInfo: {
    flex: 1,
  },
  totalSpentLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  totalSpentValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  actionsCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  actionsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  historyCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  historyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyDate: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
  },
  historyDateDay: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  historyDateMonth: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  historyInfo: {
    gap: spacing.xs,
  },
  historyTime: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontFamily: 'monospace',
  },
  historyDay: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  historyStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  historyPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
