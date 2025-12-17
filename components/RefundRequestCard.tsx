import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Clock, CheckCircle, XCircle, AlertCircle, DollarSign, Calendar } from 'lucide-react-native';
import {
  formatCurrency,
  getRefundStatusColor,
  getRefundStatusIcon,
  formatRefundReason,
  calculateProcessingTime,
  type AdminRefund,
} from '@/lib/admin-refund-management';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RefundRequestCardProps {
  refund: AdminRefund;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export default function RefundRequestCard({
  refund,
  onPress,
  onApprove,
  onReject,
  showActions = false,
}: RefundRequestCardProps) {
  const statusColor = getRefundStatusColor(refund.status);
  const statusIcon = getRefundStatusIcon(refund.status);
  const processingTime = calculateProcessingTime(refund.created_at, refund.processed_at);

  const StatusIcon = () => {
    switch (refund.status) {
      case 'Pending':
        return <Clock size={20} color={statusColor} />;
      case 'Completed':
        return <CheckCircle size={20} color={statusColor} />;
      case 'Failed':
        return <XCircle size={20} color={statusColor} />;
      default:
        return <AlertCircle size={20} color={statusColor} />;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusColor }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <StatusIcon />
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{refund.status}</Text>
            <Text style={styles.processingTime}>{processingTime}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{statusIcon}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingTitle} numberOfLines={1}>
            {refund.booking?.title || 'Booking'}
          </Text>
          {refund.booking?.scheduled_date && (
            <View style={styles.dateRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.dateText}>
                {new Date(refund.booking.scheduled_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.amountContainer}>
          <DollarSign size={16} color={colors.success} />
          <Text style={styles.amount}>{formatCurrency(refund.amount)}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reason:</Text>
          <Text style={styles.detailValue}>{formatRefundReason(refund.reason)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Requested by:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {refund.requester?.full_name || 'Unknown'}
          </Text>
        </View>
        {refund.approver && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Approved by:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {refund.approver.full_name}
            </Text>
          </View>
        )}
        {refund.stripe_refund_id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stripe ID:</Text>
            <Text style={styles.stripeId} numberOfLines={1}>
              {refund.stripe_refund_id}
            </Text>
          </View>
        )}
      </View>

      {refund.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText} numberOfLines={2}>
            {refund.notes}
          </Text>
        </View>
      )}

      {showActions && refund.status === 'Pending' && (onApprove || onReject) && (
        <View style={styles.actions}>
          {onApprove && (
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={onApprove}
            >
              <CheckCircle size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
          )}
          {onReject && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={onReject}
            >
              <XCircle size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Reject</Text>
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
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  processingTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookingInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  bookingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  details: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  stripeId: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  notesContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
