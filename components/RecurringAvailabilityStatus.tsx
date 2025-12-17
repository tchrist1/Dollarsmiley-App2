import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Repeat,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  Calendar,
  Clock,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { router } from 'expo-router';

interface RecurringAvailabilityStatusProps {
  providerId: string;
  compact?: boolean;
}

interface AvailabilitySummary {
  hasRecurringSchedule: boolean;
  recurringDays: number[];
  totalSlots: number;
  upcomingBlocks: number;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_OF_WEEK_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function RecurringAvailabilityStatus({
  providerId,
  compact = false,
}: RecurringAvailabilityStatusProps) {
  const [summary, setSummary] = useState<AvailabilitySummary>({
    hasRecurringSchedule: false,
    recurringDays: [],
    totalSlots: 0,
    upcomingBlocks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [providerId]);

  const loadSummary = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: recurring, error: recurringError } = await supabase
        .from('provider_availability')
        .select('day_of_week')
        .eq('provider_id', providerId)
        .eq('is_recurring', true)
        .eq('availability_type', 'Available');

      if (recurringError) throw recurringError;

      const uniqueDays = [...new Set(recurring?.map((r) => r.day_of_week) || [])];

      const { data: blocks, error: blocksError } = await supabase
        .from('availability_exceptions')
        .select('id')
        .eq('provider_id', providerId)
        .eq('exception_type', 'Unavailable')
        .gte('exception_date', new Date().toISOString().split('T')[0]);

      if (blocksError) throw blocksError;

      setSummary({
        hasRecurringSchedule: (recurring?.length || 0) > 0,
        recurringDays: uniqueDays.sort(),
        totalSlots: recurring?.length || 0,
        upcomingBlocks: blocks?.length || 0,
      });
    } catch (error) {
      console.error('Error loading availability summary:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => router.push('/provider/availability')}
      >
        <View style={styles.compactHeader}>
          <Repeat size={20} color={colors.primary} />
          <Text style={styles.compactTitle}>Recurring Schedule</Text>
        </View>
        {summary.hasRecurringSchedule ? (
          <View style={styles.compactContent}>
            <View style={styles.compactDays}>
              {DAYS_OF_WEEK.map((day, index) => {
                const isActive = summary.recurringDays.includes(index);
                return (
                  <View
                    key={day}
                    style={[
                      styles.compactDayChip,
                      isActive ? styles.compactDayChipActive : styles.compactDayChipInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.compactDayText,
                        isActive ? styles.compactDayTextActive : styles.compactDayTextInactive,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.compactStats}>
              <View style={styles.compactStat}>
                <Clock size={12} color={colors.primary} />
                <Text style={styles.compactStatText}>{summary.totalSlots} slots</Text>
              </View>
              {summary.upcomingBlocks > 0 && (
                <View style={styles.compactStat}>
                  <XCircle size={12} color={colors.error} />
                  <Text style={styles.compactStatText}>{summary.upcomingBlocks} blocks</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.compactEmptyText}>Not configured</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Repeat size={24} color={colors.primary} />
          <Text style={styles.title}>Recurring Availability</Text>
        </View>
        <TouchableOpacity
          onPress={() => loadSummary(true)}
          style={styles.refreshButton}
          disabled={refreshing}
        >
          <RefreshCw size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Info size={16} color={colors.primary} />
        <Text style={styles.infoText}>
          Your recurring schedule repeats weekly. Changes apply to all future weeks.
        </Text>
      </View>

      {summary.hasRecurringSchedule ? (
        <View style={styles.content}>
          <View style={styles.statusRow}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={styles.statusText}>Active Schedule</Text>
          </View>

          <View style={styles.daysSection}>
            <Text style={styles.sectionLabel}>Active Days:</Text>
            <View style={styles.daysGrid}>
              {DAYS_OF_WEEK_FULL.map((day, index) => {
                const isActive = summary.recurringDays.includes(index);
                return (
                  <View
                    key={day}
                    style={[styles.dayCard, isActive ? styles.dayCardActive : styles.dayCardInactive]}
                  >
                    <Text
                      style={[
                        styles.dayCardText,
                        isActive ? styles.dayCardTextActive : styles.dayCardTextInactive,
                      ]}
                    >
                      {day}
                    </Text>
                    {isActive && <CheckCircle size={14} color={colors.primary} />}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Clock size={20} color={colors.primary} />
              <Text style={styles.statValue}>{summary.totalSlots}</Text>
              <Text style={styles.statLabel}>Time Slots</Text>
            </View>
            <View style={styles.statBox}>
              <Calendar size={20} color={summary.upcomingBlocks > 0 ? colors.error : colors.textSecondary} />
              <Text style={styles.statValue}>{summary.upcomingBlocks}</Text>
              <Text style={styles.statLabel}>Blocked Dates</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              title="Edit Schedule"
              onPress={() => router.push('/provider/schedule-editor')}
              variant="primary"
              style={styles.actionButton}
            />
            <Button
              title="Manage Blocks"
              onPress={() => router.push('/provider/blocked-dates')}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <XCircle size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Recurring Schedule</Text>
          <Text style={styles.emptyText}>
            Set up your weekly recurring availability to let customers know when you're regularly
            available for bookings.
          </Text>
          <Button
            title="Set Up Now"
            onPress={() => router.push('/provider/schedule-editor')}
            variant="primary"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardCompact: {
    padding: spacing.md,
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
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  refreshButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: fontSize.sm * 1.5,
  },
  content: {
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  daysSection: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    minWidth: 100,
  },
  dayCardActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  dayCardInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dayCardText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  dayCardTextActive: {
    color: colors.primary,
  },
  dayCardTextInactive: {
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    marginBottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },
  compactCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  compactTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  compactContent: {
    gap: spacing.sm,
  },
  compactDays: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  compactDayChip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
  },
  compactDayChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  compactDayChipInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  compactDayText: {
    fontSize: fontSize.xs,
  },
  compactDayTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  compactDayTextInactive: {
    color: colors.textSecondary,
  },
  compactStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  compactStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactStatText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  compactEmptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
