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
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { CustomServicePayments } from '@/lib/custom-service-payments';

interface PriceAdjustment {
  id: string;
  original_price: number;
  adjusted_price: number;
  adjustment_amount: number;
  adjustment_type: 'increase' | 'decrease';
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  response_deadline?: string;
}

interface PriceAdjustmentCardProps {
  adjustment?: PriceAdjustment;
  isProvider: boolean;
  orderId: string;
  currentPrice: number;
  canRequestAdjustment: boolean;
  onAdjustmentCreated?: () => void;
  onAdjustmentResolved?: () => void;
}

export default function PriceAdjustmentCard({
  adjustment,
  isProvider,
  orderId,
  currentPrice,
  canRequestAdjustment,
  onAdjustmentCreated,
  onAdjustmentResolved,
}: PriceAdjustmentCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [newPrice, setNewPrice] = useState(currentPrice.toString());
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);

  const getTimeRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const handleRequestAdjustment = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }

    if (!justification.trim()) {
      Alert.alert('Justification Required', 'Please explain the reason for this price change');
      return;
    }

    try {
      setLoading(true);
      const result = await CustomServicePayments.requestPriceAdjustment({
        productionOrderId: orderId,
        adjustedPrice: price,
        justification: justification.trim(),
      });

      if (result.success) {
        Alert.alert('Success', 'Price adjustment request sent to customer');
        setShowForm(false);
        setJustification('');
        onAdjustmentCreated?.();
      } else {
        Alert.alert('Error', result.error || 'Failed to request price adjustment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request price adjustment');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!adjustment) return;

    Alert.alert(
      'Approve Price Adjustment',
      adjustment.adjustment_type === 'increase'
        ? `This will charge an additional $${adjustment.adjustment_amount.toFixed(2)} to your payment method.`
        : `The new price will be $${adjustment.adjusted_price.toFixed(2)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await CustomServicePayments.approvePriceAdjustment(adjustment.id);
              if (result.success) {
                Alert.alert('Success', 'Price adjustment approved');
                onAdjustmentResolved?.();
              } else {
                Alert.alert('Error', result.error || 'Failed to approve adjustment');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!adjustment) return;

    Alert.alert(
      'Reject Price Adjustment',
      'The provider can either proceed at the original price or cancel the order.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await CustomServicePayments.rejectPriceAdjustment(adjustment.id);
              if (result.success) {
                Alert.alert('Rejected', 'Price adjustment has been rejected');
                onAdjustmentResolved?.();
              } else {
                Alert.alert('Error', result.error || 'Failed to reject adjustment');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (adjustment && adjustment.status === 'pending') {
    const isIncrease = adjustment.adjustment_type === 'increase';
    const timeRemaining = getTimeRemaining(adjustment.response_deadline);

    return (
      <View style={[styles.container, styles.pendingContainer]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, isIncrease ? styles.increaseIcon : styles.decreaseIcon]}>
            {isIncrease ? (
              <TrendingUp size={24} color="#EF4444" />
            ) : (
              <TrendingDown size={24} color="#059669" />
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Price Adjustment Request</Text>
            {timeRemaining && (
              <View style={styles.timerRow}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.timerText}>Response due: {timeRemaining}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.priceComparison}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Original Price</Text>
            <Text style={styles.priceValue}>${adjustment.original_price.toFixed(2)}</Text>
          </View>
          <View style={styles.arrow}>
            {isIncrease ? (
              <TrendingUp size={20} color="#EF4444" />
            ) : (
              <TrendingDown size={20} color="#059669" />
            )}
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Adjusted Price</Text>
            <Text style={[styles.priceValue, styles.adjustedPrice]}>
              ${adjustment.adjusted_price.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={[styles.differenceBox, isIncrease ? styles.increaseBox : styles.decreaseBox]}>
          <Text style={styles.differenceLabel}>
            {isIncrease ? 'Price Increase' : 'Price Decrease'}
          </Text>
          <Text style={styles.differenceAmount}>
            {isIncrease ? '+' : '-'}${adjustment.adjustment_amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.justificationBox}>
          <Text style={styles.justificationLabel}>Provider's Explanation</Text>
          <Text style={styles.justificationText}>{adjustment.justification}</Text>
        </View>

        {!isProvider && (
          <>
            <View style={styles.customerNotice}>
              <AlertCircle size={16} color="#3B82F6" />
              <Text style={styles.customerNoticeText}>
                This provider has requested a price adjustment based on your consultation.
                No work will begin until you approve.
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={handleReject}
                disabled={loading}
              >
                <XCircle size={18} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.approveButton]}
                onPress={handleApprove}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#FFF" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {isProvider && (
          <View style={styles.providerWaiting}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.providerWaitingText}>
              Waiting for customer to respond. Customer has 72 hours to approve or reject.
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (isProvider && canRequestAdjustment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, styles.neutralIcon]}>
            <DollarSign size={24} color="#3B82F6" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Price Adjustment</Text>
            <Text style={styles.subtitle}>
              You may request one price adjustment before marking the order as received
            </Text>
          </View>
        </View>

        {!showForm ? (
          <TouchableOpacity
            style={[styles.button, styles.requestButton]}
            onPress={() => setShowForm(true)}
          >
            <DollarSign size={18} color="#3B82F6" />
            <Text style={styles.requestButtonText}>Request Price Adjustment</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.form}>
            <View style={styles.currentPriceRow}>
              <Text style={styles.currentPriceLabel}>Current Price:</Text>
              <Text style={styles.currentPriceValue}>${currentPrice.toFixed(2)}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Price *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Justification *</Text>
              <TextInput
                style={styles.textArea}
                value={justification}
                onChangeText={setJustification}
                placeholder="Explain why you're requesting this price change..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelFormButton]}
                onPress={() => {
                  setShowForm(false);
                  setNewPrice(currentPrice.toString());
                  setJustification('');
                }}
                disabled={loading}
              >
                <Text style={styles.cancelFormButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleRequestAdjustment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.reminderText}>
          Pricing will be locked once production begins.
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pendingContainer: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  increaseIcon: {
    backgroundColor: '#FEE2E2',
  },
  decreaseIcon: {
    backgroundColor: '#D1FAE5',
  },
  neutralIcon: {
    backgroundColor: '#DBEAFE',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceComparison: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  adjustedPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  differenceBox: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  increaseBox: {
    backgroundColor: '#FEE2E2',
  },
  decreaseBox: {
    backgroundColor: '#D1FAE5',
  },
  differenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  differenceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
  },
  justificationBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  justificationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  justificationText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  customerNotice: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  customerNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  approveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  providerWaiting: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  providerWaitingText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  requestButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginBottom: 12,
  },
  requestButtonText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    marginBottom: 12,
  },
  currentPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  currentPriceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  currentPriceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingVertical: 12,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelFormButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelFormButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  reminderText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
