import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CheckCircle, XCircle, Eye, MessageCircle, Clock } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { router } from 'expo-router';

interface BookingQuickActionsProps {
  bookingId: string;
  status: string;
  onAccept?: () => void;
  onReject?: () => void;
  onView?: () => void;
  loading?: boolean;
  compact?: boolean;
}

export function BookingQuickActions({
  bookingId,
  status,
  onAccept,
  onReject,
  onView,
  loading = false,
  compact = false,
}: BookingQuickActionsProps) {
  const handleView = () => {
    if (onView) {
      onView();
    } else {
      router.push(`/provider/booking-details?bookingId=${bookingId}`);
    }
  };

  if (status === 'PendingApproval') {
    if (compact) {
      return (
        <View style={styles.compactActions}>
          <TouchableOpacity
            style={[styles.compactButton, styles.acceptButton]}
            onPress={onAccept}
            disabled={loading}
          >
            <CheckCircle size={16} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.compactButton, styles.rejectButton]}
            onPress={onReject}
            disabled={loading}
          >
            <XCircle size={16} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.compactButton, styles.viewButton]}
            onPress={handleView}
            disabled={loading}
          >
            <Eye size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButtonFull]}
          onPress={onAccept}
          disabled={loading}
        >
          <CheckCircle size={18} color={colors.white} />
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButtonFull]}
          onPress={onReject}
          disabled={loading}
        >
          <XCircle size={18} color={colors.white} />
          <Text style={styles.actionButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButtonFull]}
          onPress={handleView}
          disabled={loading}
        >
          <Eye size={18} color={colors.white} />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.singleAction}>
      <TouchableOpacity
        style={[styles.actionButton, styles.viewButtonFull]}
        onPress={handleView}
        disabled={loading}
      >
        <Eye size={18} color={colors.white} />
        <Text style={styles.actionButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  compactActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  acceptButtonFull: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  rejectButtonFull: {
    backgroundColor: colors.error,
  },
  viewButton: {
    backgroundColor: colors.primary,
  },
  viewButtonFull: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  singleAction: {
    marginTop: spacing.sm,
  },
});
