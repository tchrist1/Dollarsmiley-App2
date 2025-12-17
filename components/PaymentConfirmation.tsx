import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button } from './Button';
import {
  CheckCircle,
  XCircle,
  Clock,
  Download,
  MessageCircle,
  Calendar,
  DollarSign,
  Shield,
  AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

export type PaymentStatus = 'success' | 'pending' | 'failed' | 'refunded' | 'partial';

interface PaymentDetail {
  label: string;
  value: string;
  highlight?: boolean;
}

interface PaymentConfirmationProps {
  status: PaymentStatus;
  amount: number;
  transactionId?: string;
  bookingId?: string;
  serviceName?: string;
  providerName?: string;
  date?: string;
  time?: string;
  details?: PaymentDetail[];
  message?: string;
  customTitle?: string;
  customDescription?: string;
  showReceipt?: boolean;
  showContactProvider?: boolean;
  showReschedule?: boolean;
  onDownloadReceipt?: () => void;
  onContactProvider?: () => void;
  onReschedule?: () => void;
  onViewBooking?: () => void;
  onClose?: () => void;
}

export function PaymentConfirmation({
  status,
  amount,
  transactionId,
  bookingId,
  serviceName,
  providerName,
  date,
  time,
  details = [],
  message,
  customTitle,
  customDescription,
  showReceipt = true,
  showContactProvider = false,
  showReschedule = false,
  onDownloadReceipt,
  onContactProvider,
  onReschedule,
  onViewBooking,
  onClose,
}: PaymentConfirmationProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle size={64} color={colors.success} />,
          iconBg: colors.success + '20',
          title: customTitle || 'Payment Successful!',
          description:
            customDescription ||
            'Your payment has been processed successfully. You will receive a confirmation email shortly.',
          color: colors.success,
        };
      case 'pending':
        return {
          icon: <Clock size={64} color={colors.warning} />,
          iconBg: colors.warning + '20',
          title: customTitle || 'Payment Processing',
          description:
            customDescription ||
            'Your payment is being processed. This may take a few moments. You will be notified once confirmed.',
          color: colors.warning,
        };
      case 'failed':
        return {
          icon: <XCircle size={64} color={colors.error} />,
          iconBg: colors.error + '20',
          title: customTitle || 'Payment Failed',
          description:
            customDescription ||
            'We were unable to process your payment. Please check your payment method and try again.',
          color: colors.error,
        };
      case 'refunded':
        return {
          icon: <DollarSign size={64} color={colors.primary} />,
          iconBg: colors.primary + '20',
          title: customTitle || 'Payment Refunded',
          description:
            customDescription ||
            'Your payment has been refunded. Funds will appear in your account within 5-10 business days.',
          color: colors.primary,
        };
      case 'partial':
        return {
          icon: <AlertCircle size={64} color={colors.warning} />,
          iconBg: colors.warning + '20',
          title: customTitle || 'Partial Payment Received',
          description:
            customDescription ||
            'Your deposit has been processed. The remaining balance is due before the service date.',
          color: colors.warning,
        };
      default:
        return {
          icon: <CheckCircle size={64} color={colors.success} />,
          iconBg: colors.success + '20',
          title: 'Payment Complete',
          description: 'Your transaction has been completed.',
          color: colors.success,
        };
    }
  };

  const config = getStatusConfig();

  const defaultDetails: PaymentDetail[] = [
    ...(transactionId ? [{ label: 'Transaction ID', value: transactionId }] : []),
    ...(bookingId ? [{ label: 'Booking ID', value: bookingId }] : []),
    ...(serviceName ? [{ label: 'Service', value: serviceName }] : []),
    ...(providerName ? [{ label: 'Provider', value: providerName }] : []),
    ...(date && time ? [{ label: 'Date & Time', value: `${date} at ${time}` }] : []),
    { label: 'Amount', value: `$${amount.toFixed(2)}`, highlight: true },
    { label: 'Status', value: status.charAt(0).toUpperCase() + status.slice(1), highlight: true },
  ];

  const displayDetails = details.length > 0 ? details : defaultDetails;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
          {config.icon}
        </View>

        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.description}>{config.description}</Text>

        {message && (
          <View style={[styles.messageBox, { borderLeftColor: config.color }]}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Transaction Details</Text>
          {displayDetails.map((detail, index) => (
            <View key={index} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text
                style={[
                  styles.detailValue,
                  detail.highlight && styles.detailValueHighlight,
                  detail.label === 'Status' && { color: config.color },
                ]}
              >
                {detail.value}
              </Text>
            </View>
          ))}
        </View>

        {status === 'success' && (
          <View style={styles.securityBanner}>
            <Shield size={20} color={colors.success} />
            <View style={styles.securityTextContainer}>
              <Text style={styles.securityTitle}>Secure Transaction</Text>
              <Text style={styles.securityText}>
                Your payment is protected by 256-bit encryption and held securely in escrow
              </Text>
            </View>
          </View>
        )}

        {status === 'partial' && (
          <View style={styles.warningBanner}>
            <AlertCircle size={20} color={colors.warning} />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Balance Due</Text>
              <Text style={styles.warningText}>
                Remember to pay the remaining balance before your service date
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {showReceipt && status === 'success' && (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={onDownloadReceipt || (() => {})}
            >
              <Download size={20} color={colors.primary} />
              <Text style={styles.secondaryActionText}>Download Receipt</Text>
            </TouchableOpacity>
          )}

          {showContactProvider && providerName && (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={onContactProvider || (() => {})}
            >
              <MessageCircle size={20} color={colors.primary} />
              <Text style={styles.secondaryActionText}>Contact Provider</Text>
            </TouchableOpacity>
          )}

          {showReschedule && (
            <TouchableOpacity style={styles.secondaryAction} onPress={onReschedule || (() => {})}>
              <Calendar size={20} color={colors.primary} />
              <Text style={styles.secondaryActionText}>Reschedule</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.primaryActions}>
          {onViewBooking && status === 'success' && (
            <Button title="View Booking" onPress={onViewBooking} style={styles.primaryButton} />
          )}

          {status === 'failed' && (
            <Button
              title="Try Again"
              onPress={onClose || (() => router.back())}
              style={styles.primaryButton}
            />
          )}

          <Button
            title={status === 'success' ? 'Back to Home' : 'Close'}
            variant="outline"
            onPress={onClose || (() => router.push('/(tabs)'))}
            style={styles.primaryButton}
          />
        </View>

        <View style={styles.supportBox}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            If you have any questions about this transaction, please contact our support team.
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  messageBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  detailsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  detailValueHighlight: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  securityTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  securityTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  securityText: {
    fontSize: fontSize.xs,
    color: colors.text,
    lineHeight: 18,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  warningTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  warningText: {
    fontSize: fontSize.xs,
    color: colors.text,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  secondaryActionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  primaryActions: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    width: '100%',
  },
  supportBox: {
    backgroundColor: colors.primary + '05',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  supportText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  supportButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  supportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
