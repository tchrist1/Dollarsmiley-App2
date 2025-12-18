import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CheckCircle, DollarSign, Calendar, AlertCircle } from 'lucide-react-native';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { ProductionOrder } from '@/types/database';

interface OrderReceivedConfirmationProps {
  visible: boolean;
  order: ProductionOrder;
  onClose: () => void;
  onConfirmed: () => void;
}

export default function OrderReceivedConfirmation({
  visible,
  order,
  onClose,
  onConfirmed,
}: OrderReceivedConfirmationProps) {
  const [loading, setLoading] = useState(false);

  const finalPrice = order.final_price || order.proposed_price || 0;
  const platformFee = finalPrice * 0.15;
  const providerEarnings = finalPrice - platformFee;
  const payoutDate = new Date();
  payoutDate.setDate(payoutDate.getDate() + 14);

  const handleConfirm = async () => {
    try {
      setLoading(true);

      const result = await CustomServicePayments.markOrderReceived(order.id);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to mark order as received');
        return;
      }

      Alert.alert(
        'Payment Captured',
        `$${finalPrice.toFixed(2)} has been charged to the customer. Your payout of $${providerEarnings.toFixed(2)} is scheduled for ${payoutDate.toLocaleDateString()}.`
      );
      onConfirmed();
      onClose();
    } catch (error: any) {
      console.error('Error marking order received:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              <CheckCircle size={64} color="#059669" />
              <Text style={styles.title}>Mark Order as Received</Text>
              <Text style={styles.subtitle}>
                This will charge the customer's card and schedule your payout
              </Text>
            </View>

            <View style={styles.warningCard}>
              <AlertCircle size={24} color="#F59E0B" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Important</Text>
                <Text style={styles.warningText}>
                  Only mark this order as received once you're ready to begin production. The
                  customer will be charged immediately.
                </Text>
              </View>
            </View>

            <View style={styles.paymentCard}>
              <Text style={styles.sectionTitle}>Payment Details</Text>

              <View style={styles.row}>
                <Text style={styles.label}>Order Total</Text>
                <Text style={styles.value}>${finalPrice.toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Platform Fee (15%)</Text>
                <Text style={[styles.value, styles.feeValue]}>
                  -${platformFee.toFixed(2)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.totalLabel}>Your Earnings</Text>
                <Text style={styles.totalValue}>${providerEarnings.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.payoutCard}>
              <Calendar size={20} color="#3B82F6" />
              <View style={styles.payoutContent}>
                <Text style={styles.payoutLabel}>Payout Date</Text>
                <Text style={styles.payoutDate}>
                  {payoutDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.payoutNote}>14 days from order receipt</Text>
              </View>
            </View>

            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>Before You Confirm</Text>
              <View style={styles.checklistItems}>
                <View style={styles.checklistItem}>
                  <View style={styles.checklistBullet} />
                  <Text style={styles.checklistText}>
                    Customer has approved the final price
                  </Text>
                </View>
                <View style={styles.checklistItem}>
                  <View style={styles.checklistBullet} />
                  <Text style={styles.checklistText}>
                    You have all materials ready to start
                  </Text>
                </View>
                <View style={styles.checklistItem}>
                  <View style={styles.checklistBullet} />
                  <Text style={styles.checklistText}>
                    You can meet the agreed fulfillment timeline
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <DollarSign size={20} color="#FFF" />
                    <Text style={styles.confirmButtonText}>Charge Customer</Text>
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
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  paymentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  feeValue: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#059669',
  },
  payoutCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  payoutContent: {
    flex: 1,
  },
  payoutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  payoutNote: {
    fontSize: 12,
    color: '#6B7280',
  },
  checklistCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  checklistItems: {
    gap: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checklistBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  checklistText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
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
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  confirmButton: {
    backgroundColor: '#059669',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
