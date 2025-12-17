import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import {
  Repeat,
  Calendar,
  DollarSign,
  Clock,
  Pause,
  Play,
  Trash2,
  ChevronRight,
  CheckCircle,
} from 'lucide-react-native';
import {
  type RecurringBooking,
  formatRecurrencePattern,
} from '@/lib/recurring-bookings';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RecurringBookingCardProps {
  booking: RecurringBooking;
  onPress?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export default function RecurringBookingCard({
  booking,
  onPress,
  onPause,
  onResume,
  onCancel,
  showActions = true,
}: RecurringBookingCardProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const handlePause = () => {
    Alert.alert(
      'Pause Recurring Booking',
      'Future bookings will not be automatically created. Existing bookings will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            await onPause?.();
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleResume = () => {
    Alert.alert(
      'Resume Recurring Booking',
      'Future bookings will be automatically created again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          onPress: async () => {
            setActionLoading(true);
            await onResume?.();
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Recurring Booking',
      'This will stop all future bookings. Existing bookings will not be affected. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Recurring',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            await onCancel?.();
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const getStatusColor = () => {
    if (!booking.is_active) return colors.textSecondary;
    return colors.success;
  };

  const getStatusLabel = () => {
    if (!booking.is_active) return 'Inactive';
    return 'Active';
  };

  const getTotalOccurrences = () => {
    if (booking.recurrence_pattern.end_type === 'occurrences') {
      return booking.recurrence_pattern.occurrences || 0;
    }
    return '∞';
  };

  const getProgress = () => {
    const total = getTotalOccurrences();
    if (total === '∞') return null;
    return (booking.created_bookings / (total as number)) * 100;
  };

  const progress = getProgress();

  return (
    <TouchableOpacity
      style={[styles.card, !booking.is_active && styles.cardInactive]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={actionLoading}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: getStatusColor() + '20' }]}>
            <Repeat size={20} color={getStatusColor()} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {booking.service_title}
            </Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
      </View>

      <View style={styles.patternContainer}>
        <Repeat size={14} color={colors.textSecondary} />
        <Text style={styles.patternText}>{formatRecurrencePattern(booking.recurrence_pattern)}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={styles.statLabel}>Created</Text>
          <Text style={styles.statValue}>{booking.created_bookings}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <CheckCircle size={16} color={colors.textSecondary} />
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{getTotalOccurrences()}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <DollarSign size={16} color={colors.textSecondary} />
          <Text style={styles.statLabel}>Per Booking</Text>
          <Text style={styles.statValue}>${booking.service_price}</Text>
        </View>
      </View>

      {progress !== null && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}

      {booking.next_booking_date && booking.is_active && (
        <View style={styles.nextBookingContainer}>
          <Clock size={14} color={colors.primary} />
          <Text style={styles.nextBookingText}>
            Next: {new Date(booking.next_booking_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })} at {booking.start_time}
          </Text>
        </View>
      )}

      {showActions && (
        <View style={styles.actions}>
          {booking.is_active ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.pauseButton]}
                onPress={handlePause}
                disabled={actionLoading}
              >
                <Pause size={16} color={colors.warning} />
                <Text style={[styles.actionButtonText, { color: colors.warning }]}>Pause</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                disabled={actionLoading}
              >
                <Trash2 size={16} color={colors.error} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>Stop</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.resumeButton]}
              onPress={handleResume}
              disabled={actionLoading}
            >
              <Play size={16} color={colors.success} />
              <Text style={[styles.actionButtonText, { color: colors.success }]}>Resume</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInactive: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  patternContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  patternText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  nextBookingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  nextBookingText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  pauseButton: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning + '30',
  },
  cancelButton: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
  },
  resumeButton: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success + '30',
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
