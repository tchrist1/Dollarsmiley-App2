import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react-native';
import {
  formatCurrency,
  getRefundStatusColor,
  getRefundStatusText,
  getRefundReasonDisplay,
  getEstimatedProcessingTime,
  isRefundProcessing,
  type CustomerRefund,
} from '@/lib/customer-refunds';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RefundStatusTrackerProps {
  refund: CustomerRefund;
}

export default function RefundStatusTracker({ refund }: RefundStatusTrackerProps) {
  const statusColor = getRefundStatusColor(refund.status);
  const statusText = getRefundStatusText(refund.status);
  const processing = isRefundProcessing(refund);
  const estimatedTime = getEstimatedProcessingTime(refund);

  const StatusIcon = () => {
    switch (refund.status) {
      case 'Pending':
        return <Clock size={24} color={statusColor} />;
      case 'Completed':
        return <CheckCircle size={24} color={statusColor} />;
      case 'Failed':
        return <XCircle size={24} color={statusColor} />;
      default:
        return <AlertCircle size={24} color={statusColor} />;
    }
  };

  const getStatusMessage = () => {
    switch (refund.status) {
      case 'Pending':
        return 'Your refund request is being reviewed by our team.';
      case 'Completed':
        return 'Your refund has been processed and funds have been returned.';
      case 'Failed':
        return 'Your refund request was declined.';
      default:
        return 'Unknown status';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <StatusIcon />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.statusMessage}>{getStatusMessage()}</Text>
            {processing && estimatedTime && (
              <Text style={styles.estimatedTime}>{estimatedTime}</Text>
            )}
          </View>
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Refund Amount</Text>
            <View style={styles.amountValue}>
              <DollarSign size={18} color={colors.success} />
              <Text style={styles.amount}>{formatCurrency(refund.amount)}</Text>
            </View>
          </View>
        </View>

        {refund.booking && (
          <View style={styles.bookingSection}>
            <Text style={styles.sectionLabel}>Booking</Text>
            <Text style={styles.bookingTitle}>{refund.booking.title}</Text>
            {refund.booking.scheduled_date && (
              <Text style={styles.bookingDate}>
                {new Date(refund.booking.scheduled_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            )}
          </View>
        )}

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reason</Text>
            <Text style={styles.detailValue}>
              {getRefundReasonDisplay(refund.reason)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested</Text>
            <Text style={styles.detailValue}>
              {new Date(refund.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          {refund.processed_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Processed</Text>
              <Text style={styles.detailValue}>
                {new Date(refund.processed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {refund.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notesText}>{refund.notes}</Text>
          </View>
        )}
      </View>

      {refund.status === 'Pending' && (
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineTitle}>Processing Timeline</Text>
          <View style={styles.timeline}>
            <View style={[styles.timelineStep, styles.timelineStepCompleted]}>
              <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Request Submitted</Text>
                <Text style={styles.timelineDate}>
                  {new Date(refund.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={[styles.timelineStep, styles.timelineStepActive]}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Under Review</Text>
                <Text style={styles.timelineSubtext}>
                  Our team is reviewing your request
                </Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineStep}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Processing</Text>
                <Text style={styles.timelineSubtext}>Refund will be processed</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineStep}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Completed</Text>
                <Text style={styles.timelineSubtext}>
                  Funds returned to your account
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {refund.status === 'Completed' && (
        <View style={styles.successInfo}>
          <CheckCircle size={20} color={colors.success} />
          <Text style={styles.successText}>
            The refund has been processed. It may take 5-10 business days for the
            funds to appear in your account depending on your payment method.
          </Text>
        </View>
      )}

      {refund.status === 'Failed' && (
        <View style={styles.failureInfo}>
          <AlertCircle size={20} color={colors.error} />
          <Text style={styles.failureText}>
            If you believe this decision was made in error, please contact our
            support team for assistance.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  estimatedTime: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  amountSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  amountValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  bookingSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  bookingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  bookingDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailsSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  notesSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  timelineContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  timelineTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  timeline: {
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  timelineStepCompleted: {
    opacity: 1,
  },
  timelineStepActive: {
    opacity: 1,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  timelineDotCompleted: {
    backgroundColor: colors.success,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
    marginLeft: 9,
  },
  timelineContent: {
    flex: 1,
    gap: spacing.xs,
  },
  timelineLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  timelineDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  timelineSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  successInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.success + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  successText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.success,
    lineHeight: 20,
  },
  failureInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.error + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  failureText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: 20,
  },
});
