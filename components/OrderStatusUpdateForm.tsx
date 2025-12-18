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
import { ProductionManagement, PRODUCTION_STATUSES } from '@/lib/production-management';
import {
  Package,
  Play,
  Camera,
  Truck,
  CheckCircle,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';

interface OrderStatusUpdateFormProps {
  orderId: string;
  providerId: string;
  currentStatus: string;
  onStatusUpdate: () => void;
}

const STATUS_ACTIONS: Record<string, {
  nextStatus: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  requiresInput?: string;
}> = {
  pending_order_received: {
    nextStatus: 'order_received',
    label: 'Confirm Order Receipt',
    description: 'Acknowledge receipt and start preparing for production',
    icon: CheckCircle,
    color: colors.success,
  },
  order_received: {
    nextStatus: 'in_production',
    label: 'Start Production',
    description: 'Begin working on this custom order',
    icon: Play,
    color: colors.primary,
    requiresInput: 'estimatedDays',
  },
  in_production: {
    nextStatus: 'pending_approval',
    label: 'Submit for Approval',
    description: 'Submit proof images for customer review',
    icon: Camera,
    color: colors.info,
  },
  ready_for_delivery: {
    nextStatus: 'shipped',
    label: 'Mark as Shipped',
    description: 'Update when the order has been shipped',
    icon: Truck,
    color: colors.success,
    requiresInput: 'shipping',
  },
};

export default function OrderStatusUpdateForm({
  orderId,
  providerId,
  currentStatus,
  onStatusUpdate,
}: OrderStatusUpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const [estimatedDays, setEstimatedDays] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [notes, setNotes] = useState('');

  const statusAction = STATUS_ACTIONS[currentStatus];
  const currentStatusConfig = PRODUCTION_STATUSES[currentStatus as keyof typeof PRODUCTION_STATUSES];

  if (!statusAction || !currentStatusConfig.canTransition) {
    return null;
  }

  const ActionIcon = statusAction.icon;

  const handleStatusUpdate = async () => {
    setLoading(true);

    try {
      let result;

      switch (currentStatus) {
        case 'pending_order_received':
          result = await ProductionManagement.receiveOrder(orderId, providerId);
          break;

        case 'order_received':
          const days = estimatedDays ? parseInt(estimatedDays, 10) : undefined;
          result = await ProductionManagement.startProduction(orderId, providerId, days);
          break;

        case 'ready_for_delivery':
          result = await ProductionManagement.markShipped(
            orderId,
            providerId,
            trackingNumber || undefined,
            carrier || undefined
          );
          break;

        default:
          result = await ProductionManagement.updateOrderStatus(
            orderId,
            statusAction.nextStatus,
            providerId,
            notes || undefined
          );
      }

      if (result.success) {
        Alert.alert('Status Updated', 'The order status has been updated successfully.');
        onStatusUpdate();
      } else {
        Alert.alert('Error', result.error || 'Failed to update status');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const confirmUpdate = () => {
    Alert.alert(
      statusAction.label,
      `Are you sure you want to ${statusAction.label.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: handleStatusUpdate },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Next Step</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusAction.color + '20' }]}>
          <ActionIcon size={16} color={statusAction.color} />
          <Text style={[styles.statusText, { color: statusAction.color }]}>
            {statusAction.label}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{statusAction.description}</Text>

      {statusAction.requiresInput === 'estimatedDays' && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Estimated Completion (Days)</Text>
          <TextInput
            style={styles.input}
            value={estimatedDays}
            onChangeText={setEstimatedDays}
            placeholder="E.g., 7"
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
          />
          <Text style={styles.inputHelper}>
            How many days until this order is ready?
          </Text>
        </View>
      )}

      {statusAction.requiresInput === 'shipping' && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Tracking Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={trackingNumber}
            onChangeText={setTrackingNumber}
            placeholder="Enter tracking number"
            placeholderTextColor={colors.textLight}
          />

          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
            Carrier (Optional)
          </Text>
          <TextInput
            style={styles.input}
            value={carrier}
            onChangeText={setCarrier}
            placeholder="E.g., USPS, FedEx, UPS"
            placeholderTextColor={colors.textLight}
          />
        </View>
      )}

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes about this update..."
          placeholderTextColor={colors.textLight}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: statusAction.color }]}
        onPress={confirmUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <ActionIcon size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>{statusAction.label}</Text>
            <ChevronRight size={20} color={colors.white} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.warningSection}>
        <AlertCircle size={16} color={colors.warning} />
        <Text style={styles.warningText}>
          This action will notify the customer of the status change.
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: {
    minHeight: 60,
  },
  inputHelper: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButtonText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
