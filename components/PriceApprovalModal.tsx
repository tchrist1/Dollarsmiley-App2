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
import { AlertCircle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react-native';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { ProductionOrder } from '@/types/database';

interface PriceApprovalModalProps {
  visible: boolean;
  order: ProductionOrder;
  onClose: () => void;
  onApproved: () => void;
  onDeclined: () => void;
}

export default function PriceApprovalModal({
  visible,
  order,
  onClose,
  onApproved,
  onDeclined,
}: PriceApprovalModalProps) {
  const [loading, setLoading] = useState(false);

  const originalPrice = order.authorization_amount || 0;
  const proposedPrice = order.proposed_price || 0;
  const difference = proposedPrice - originalPrice;
  const percentChange = originalPrice > 0 ? ((difference / originalPrice) * 100).toFixed(1) : '0';
  const isIncrease = difference > 0;

  const handleApprove = async () => {
    try {
      setLoading(true);

      const result = await CustomServicePayments.approvePrice(order.id);

      if (result.needsReauthorization) {
        Alert.alert(
          'Authorization Expired',
          'Your payment authorization has expired. Please reauthorize your payment to continue.',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
              },
            },
          ]
        );
        return;
      }

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to approve price');
        return;
      }

      Alert.alert(
        'Price Approved',
        'The provider has been notified. They will mark your order as received to begin production.'
      );
      onApproved();
      onClose();
    } catch (error: any) {
      console.error('Error approving price:', error);
      Alert.alert('Error', 'Failed to approve price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Price',
      'Are you sure you want to decline this price? You can discuss alternatives with the provider.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            onDeclined();
            onClose();
          },
        },
      ]
    );
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
              <AlertCircle size={48} color="#F59E0B" />
              <Text style={styles.title}>Price Approval Required</Text>
              <Text style={styles.subtitle}>
                The provider has reviewed your requirements and proposed a final price
              </Text>
            </View>

            <View style={styles.priceComparison}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Original Estimate</Text>
                <Text style={styles.priceValue}>${originalPrice.toFixed(2)}</Text>
              </View>

              <View style={styles.arrow}>
                {isIncrease ? (
                  <TrendingUp size={24} color="#EF4444" />
                ) : (
                  <TrendingDown size={24} color="#10B981" />
                )}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Proposed Price</Text>
                <Text style={[styles.priceValue, styles.proposedPrice]}>
                  ${proposedPrice.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={[styles.differenceCard, isIncrease ? styles.increaseCard : styles.decreaseCard]}>
              <Text style={styles.differenceLabel}>
                {isIncrease ? 'Price Increase' : 'Price Decrease'}
              </Text>
              <Text style={styles.differenceAmount}>
                {isIncrease ? '+' : '-'}${Math.abs(difference).toFixed(2)}
              </Text>
              <Text style={styles.differencePercent}>
                ({isIncrease ? '+' : ''}{percentChange}%)
              </Text>
            </View>

            {order.price_change_reason && (
              <View style={styles.reasonCard}>
                <Text style={styles.reasonLabel}>Provider's Explanation</Text>
                <Text style={styles.reasonText}>{order.price_change_reason}</Text>
              </View>
            )}

            {isIncrease && (
              <View style={styles.infoCard}>
                <AlertCircle size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Your card will be authorized for the new amount. The charge will occur when the
                  provider marks your order as received.
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={handleDecline}
                disabled={loading}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.approveButton]}
                onPress={handleApprove}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFF" />
                    <Text style={styles.approveButtonText}>Approve Price</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
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
  priceComparison: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  proposedPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#059669',
  },
  arrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  differenceCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  increaseCard: {
    backgroundColor: '#FEE2E2',
  },
  decreaseCard: {
    backgroundColor: '#D1FAE5',
  },
  differenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  differenceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
  },
  differencePercent: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  reasonCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  declineButton: {
    backgroundColor: '#F3F4F6',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
