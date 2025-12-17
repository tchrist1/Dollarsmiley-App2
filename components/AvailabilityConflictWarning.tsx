import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, XCircle, Clock, Ban } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Conflict {
  type: 'booking' | 'blocked' | 'no_availability' | 'outside_hours';
  message: string;
  booking_id?: string;
  booking_title?: string;
  blocked_reason?: string;
}

interface AvailabilityConflictWarningProps {
  conflicts: Conflict[];
  style?: any;
}

export function AvailabilityConflictWarning({
  conflicts,
  style,
}: AvailabilityConflictWarningProps) {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  const getIconForType = (type: Conflict['type']) => {
    switch (type) {
      case 'booking':
        return <XCircle size={20} color={colors.error} />;
      case 'blocked':
        return <Ban size={20} color={colors.error} />;
      case 'no_availability':
        return <Clock size={20} color={colors.warning} />;
      case 'outside_hours':
        return <AlertTriangle size={20} color={colors.warning} />;
      default:
        return <AlertTriangle size={20} color={colors.error} />;
    }
  };

  const getColorForType = (type: Conflict['type']) => {
    switch (type) {
      case 'booking':
      case 'blocked':
        return colors.error;
      case 'no_availability':
      case 'outside_hours':
        return colors.warning;
      default:
        return colors.error;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <AlertTriangle size={20} color={colors.error} />
        <Text style={styles.title}>Availability Conflict</Text>
      </View>

      {conflicts.map((conflict, index) => {
        const color = getColorForType(conflict.type);

        return (
          <View key={index} style={styles.conflictItem}>
            <View style={styles.conflictIcon}>{getIconForType(conflict.type)}</View>
            <View style={styles.conflictContent}>
              <Text style={[styles.conflictMessage, { color }]}>{conflict.message}</Text>
              {conflict.booking_title && (
                <Text style={styles.conflictDetail}>Booking: {conflict.booking_title}</Text>
              )}
              {conflict.blocked_reason && (
                <Text style={styles.conflictDetail}>Reason: {conflict.blocked_reason}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  conflictItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
  },
  conflictIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  conflictContent: {
    flex: 1,
  },
  conflictMessage: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  conflictDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
