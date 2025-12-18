import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { XCircle, DollarSign, AlertCircle } from 'lucide-react-native';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { CustomServicePricing } from '@/lib/custom-service-pricing';
import { ProductionOrder } from '@/types/database';
import RefundPolicyCard from './RefundPolicyCard';

interface CancelOrderModalProps {
  visible: boolean;
  order: ProductionOrder;
  onClose: () => void;
  onCancelled: () => void;
}

export default function CancelOrderModal({
  visible,
  order,
  onClose,
  onCancelled,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isBeforeCapture = !order.payment_captured_at;
  const refundAmount = isBeforeCapture
    ? 0
    : CustomServicePricing.getRefundAmount(
        order.final_price || 0,
        order.refund_policy || 'fully_refundable',
        0
      );

  const canCancel = CustomServicePricing.canCancelOrder(
    order.status,
    order.payment_captured_at
  );

  const handleCancel = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancellation');
      return;
    }

    if (!canCancel) {
      Alert.alert(
        'Cannot Cancel',
        'This order cannot be cancelled at this stage. Please contact support if you have concerns.'
      );
      return;
    }

    try {
      setLoading(true);

      if (isBeforeCapture && order.payment_intent_id) {
        const result = await CustomServicePayments.cancelAuthorization(
          order.id,
          order.payment_intent_id,
          reason
        );

        if (!result.success) {
          Alert.alert('Error', result.error || 'Failed to cancel order');
          return;
        }

        Alert.alert(
          'Order Cancelled',
          'The authorization hold has been released. No charges were made to your card.'
        );
      } else {
        const result = await CustomServicePayments.refundOrder(order.id, reason, refundAmount);

        if (!result.success) {
          Alert.alert('Error', result.error || 'Failed to process refund');
          return;
        }

        if (result.refundedAmount && result.refundedAmount > 0) {
          Alert.alert(
            'Refund Processed',
            `$${result.refundedAmount.toFixed(2)} will be returned to your card in 5-10 business days.`
          );
        } else {
          Alert.alert('Order Cancelled', 'Your order has been cancelled.');
        }
      }

      onCancelled();
      onClose();
      setReason('');
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      Alert.alert('Error', 'Failed to cancel order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!canCancel) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <AlertCircle size={64} color="#EF4444" />
              <Text style={styles.title}>Cannot Cancel Order</Text>
              <Text style={styles.subtitle}>
                This order is no longer eligible for cancellation
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Production has progressed beyond the point where cancellation is possible. If you
                have concerns about the order, please contact the provider or our support team.
              </Text>
            </View>

            <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <XCircle size={64} color="#EF4444" />
              <Text style={styles.title}>Cancel Order</Text>
              <Text style={styles.subtitle}>
                {isBeforeCapture
                  ? 'The authorization hold will be released'
                  : 'Review refund details below'}
              </Text>
            </View>

            {!isBeforeCapture && order.refund_policy && (
              <RefundPolicyCard
                policy={order.refund_policy}
                finalPrice={order.final_price || 0}
                shippingCost={0}
              />
            )}

            {isBeforeCapture ? (
              <View style={styles.holdCard}>
                <DollarSign size={24} color="#3B82F6" />
                <View style={styles.holdContent}>
                  <Text style={styles.holdTitle}>No Charges Will Be Made</Text>
                  <Text style={styles.holdText}>
                    Since payment hasn't been captured yet, the authorization hold on your card
                    will be released immediately. No charges will appear on your statement.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.refundCard}>
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Refund Amount</Text>
                  <Text style={styles.refundAmount}>${refundAmount.toFixed(2)}</Text>
                </View>
                <Text style={styles.refundNote}>
                  Refunds typically appear in 5-10 business days
                </Text>
              </View>
            )}

            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Reason for Cancellation *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Please explain why you're cancelling..."
                placeholderTextColor="#9CA3AF"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.reasonHint}>
                This helps us improve our service and may be shared with the provider
              </Text>
            </View>

            <View style={styles.warningCard}>
              <AlertCircle size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                This action cannot be undone. The order will be permanently cancelled.
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>Keep Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelOrderButton]}
                onPress={handleCancel}
                disabled={loading || !reason.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <XCircle size={20} color="#FFF" />
                    <Text style={styles.cancelOrderButtonText}>Cancel Order</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  holdCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  holdContent: {
    flex: 1,
  },
  holdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  holdText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  refundCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refundLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  refundAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  refundNote: {
    fontSize: 12,
    color: '#6B7280',
  },
  reasonSection: {
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 10,
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cancelOrderButton: {
    backgroundColor: '#EF4444',
  },
  cancelOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  closeButton: {
    backgroundColor: '#3B82F6',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
