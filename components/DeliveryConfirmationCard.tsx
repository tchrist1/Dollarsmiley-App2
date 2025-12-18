import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { ProductionManagement } from '@/lib/production-management';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  Star,
  Shield,
} from 'lucide-react-native';

interface DeliveryConfirmationCardProps {
  orderId: string;
  customerId: string;
  orderStatus: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  onConfirmDelivery: () => void;
  onReportIssue: () => void;
}

export default function DeliveryConfirmationCard({
  orderId,
  customerId,
  orderStatus,
  trackingNumber,
  shippingCarrier,
  onConfirmDelivery,
  onReportIssue,
}: DeliveryConfirmationCardProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const handleConfirmDelivery = async () => {
    Alert.alert(
      'Confirm Delivery',
      'By confirming delivery, you acknowledge that you have received the order in satisfactory condition. The payment will be released to the provider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Receipt',
          onPress: async () => {
            setLoading(true);

            const confirmResult = await ProductionManagement.confirmDelivery(
              orderId,
              customerId,
              notes || undefined
            );

            if (confirmResult.success) {
              setReleaseLoading(true);
              const releaseResult = await CustomServicePayments.releaseEscrowFunds(orderId);
              setReleaseLoading(false);

              if (releaseResult.success) {
                Alert.alert(
                  'Delivery Confirmed',
                  'Thank you for confirming delivery. The payment has been released to the provider.',
                  [{ text: 'OK', onPress: onConfirmDelivery }]
                );
              } else {
                Alert.alert(
                  'Delivery Confirmed',
                  'Your delivery has been confirmed. Payment will be processed shortly.',
                  [{ text: 'OK', onPress: onConfirmDelivery }]
                );
              }
            } else {
              Alert.alert('Error', confirmResult.error || 'Failed to confirm delivery');
            }

            setLoading(false);
          },
        },
      ]
    );
  };

  const handleReportIssue = () => {
    Alert.alert(
      'Report an Issue',
      'What kind of issue would you like to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Not Received',
          onPress: () => onReportIssue(),
        },
        {
          text: 'Damaged/Wrong Item',
          onPress: () => onReportIssue(),
        },
        {
          text: 'Quality Issue',
          onPress: () => onReportIssue(),
        },
      ]
    );
  };

  if (orderStatus === 'completed') {
    return (
      <View style={styles.completedCard}>
        <CheckCircle size={32} color={colors.success} />
        <Text style={styles.completedTitle}>Delivery Confirmed</Text>
        <Text style={styles.completedText}>
          You confirmed receipt of this order. Payment has been released to the provider.
        </Text>
      </View>
    );
  }

  if (orderStatus !== 'shipped' && orderStatus !== 'ready_for_delivery') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Package size={24} color={colors.primary} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {orderStatus === 'shipped' ? 'Order Shipped' : 'Ready for Pickup'}
          </Text>
          <Text style={styles.subtitle}>
            {orderStatus === 'shipped'
              ? 'Your order is on its way'
              : 'Your order is ready to be picked up'}
          </Text>
        </View>
      </View>

      {trackingNumber && (
        <View style={styles.trackingInfo}>
          <Text style={styles.trackingLabel}>Tracking Number</Text>
          <Text style={styles.trackingValue}>{trackingNumber}</Text>
          {shippingCarrier && (
            <Text style={styles.carrierText}>via {shippingCarrier}</Text>
          )}
        </View>
      )}

      <View style={styles.escrowInfo}>
        <Shield size={18} color={colors.success} />
        <Text style={styles.escrowText}>
          Your payment is held securely until you confirm delivery
        </Text>
      </View>

      {showConfirmation ? (
        <View style={styles.confirmationForm}>
          <Text style={styles.confirmationTitle}>Confirm Delivery</Text>
          <Text style={styles.confirmationDescription}>
            Have you received your order and are satisfied with it?
          </Text>

          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about the delivery (optional)"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={2}
          />

          <View style={styles.confirmationActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfirmation(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmDelivery}
              disabled={loading || releaseLoading}
            >
              {loading || releaseLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <CheckCircle size={18} color={colors.white} />
                  <Text style={styles.confirmButtonText}>Confirm Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowConfirmation(true)}
          >
            <CheckCircle size={18} color={colors.white} />
            <Text style={styles.primaryButtonText}>I Received My Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleReportIssue}
          >
            <AlertTriangle size={18} color={colors.warning} />
            <Text style={styles.secondaryButtonText}>Report an Issue</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.helpSection}>
        <MessageCircle size={16} color={colors.textSecondary} />
        <Text style={styles.helpText}>
          Have questions? Contact the provider through chat.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trackingInfo: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  trackingLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  trackingValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  carrierText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  escrowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  escrowText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.successDark,
  },
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.warningDark,
  },
  confirmationForm: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  confirmationTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  confirmationDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  notesInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  completedCard: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.successDark,
    marginTop: spacing.md,
  },
  completedText: {
    fontSize: fontSize.sm,
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
