import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Lock, AlertCircle, CreditCard, MessageCircle, CheckCircle } from 'lucide-react-native';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { useStripe } from '@stripe/stripe-react-native';

interface CustomServiceCheckoutProps {
  orderId: string;
  customerId: string;
  providerId: string;
  estimatedPrice: number;
  productType: string;
  providerRequiresConsultation?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomServiceCheckout({
  orderId,
  customerId,
  providerId,
  estimatedPrice,
  productType,
  providerRequiresConsultation = false,
  onSuccess,
  onCancel,
}: CustomServiceCheckoutProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [consultationRequested, setConsultationRequested] = useState(false);

  const consultationRequired = providerRequiresConsultation || consultationRequested;

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const result = await CustomServicePayments.initializeCustomServiceOrder({
        productionOrderId: orderId,
        customerId,
        providerId,
        amount: estimatedPrice,
        description: `Custom ${productType}`,
        consultationRequested,
        providerRequiresConsultation,
        metadata: {
          order_type: 'custom_service',
          payment_model: 'escrow',
        },
      });

      if (!result.success || !result.clientSecret) {
        Alert.alert('Error', result.error || 'Failed to initialize payment');
        return;
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: result.clientSecret,
        merchantDisplayName: 'DollarSmiley',
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          Alert.alert('Payment Cancelled', 'You cancelled the payment.');
          return;
        }
        Alert.alert('Payment Failed', presentError.message);
        return;
      }

      const successMessage = consultationRequired
        ? 'Your payment is securely held in escrow. The provider will contact you for a consultation before work begins.'
        : 'Your payment is securely held in escrow. The provider will review your order and may contact you if needed.';

      Alert.alert('Payment Successful', successMessage, [
        {
          text: 'OK',
          onPress: onSuccess,
        },
      ]);
    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Error', error.message || 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Secure Checkout</Text>
        <Text style={styles.subtitle}>
          Your payment will be held securely until the order is completed
        </Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Order Total</Text>
        <Text style={styles.priceValue}>${estimatedPrice.toFixed(2)}</Text>
        <View style={styles.escrowBadge}>
          <Lock size={14} color="#059669" />
          <Text style={styles.escrowText}>Held in Escrow</Text>
        </View>
      </View>

      <View style={styles.consultationSection}>
        <Text style={styles.sectionTitle}>Consultation Option</Text>
        <Text style={styles.consultationDescription}>
          Some custom services may benefit from a short consultation before work begins.
          You'll always be notified and must approve any price changes before work starts.
        </Text>

        {providerRequiresConsultation ? (
          <View style={styles.requiredBadge}>
            <AlertCircle size={18} color="#F59E0B" />
            <Text style={styles.requiredText}>
              This provider requires consultation for all custom orders
            </Text>
          </View>
        ) : (
          <View style={styles.consultationOptions}>
            <Text style={styles.optionLabel}>
              Do you need a consultation before work begins?
            </Text>
            <View style={styles.optionButtons}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  !consultationRequested && styles.optionButtonSelected,
                ]}
                onPress={() => setConsultationRequested(false)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    !consultationRequested && styles.radioOuterSelected,
                  ]}
                >
                  {!consultationRequested && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    !consultationRequested && styles.optionTextSelected,
                  ]}
                >
                  No (default)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  consultationRequested && styles.optionButtonSelected,
                ]}
                onPress={() => setConsultationRequested(true)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    consultationRequested && styles.radioOuterSelected,
                  ]}
                >
                  {consultationRequested && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    consultationRequested && styles.optionTextSelected,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Lock size={20} color="#059669" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Secure Escrow Payment</Text>
            <Text style={styles.infoText}>
              Your payment is captured now and held securely in escrow. Funds are only released
              to the provider after your order is completed.
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <AlertCircle size={20} color="#F59E0B" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Price May Be Adjusted</Text>
            <Text style={styles.infoText}>
              The provider may request a one-time price adjustment before work begins.
              You must approve any price changes first.
            </Text>
          </View>
        </View>

        {consultationRequired && (
          <View style={styles.infoRow}>
            <MessageCircle size={20} color="#3B82F6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Consultation Required</Text>
              <Text style={styles.infoText}>
                The provider will contact you for a consultation before marking the order as
                received. Work will not begin until consultation is complete.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <CreditCard size={20} color="#8B5CF6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Full Refund Protection</Text>
            <Text style={styles.infoText}>
              You can cancel and receive a full refund before the order is marked as received
              by the provider.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.timeline}>
        <Text style={styles.timelineTitle}>What Happens Next</Text>
        <View style={styles.timelineSteps}>
          <View style={styles.timelineStep}>
            <View style={styles.timelineNumber}>
              <Text style={styles.timelineNumberText}>1</Text>
            </View>
            <Text style={styles.timelineStepText}>
              Payment is captured and held in escrow
            </Text>
          </View>
          {consultationRequired && (
            <View style={styles.timelineStep}>
              <View style={[styles.timelineNumber, styles.timelineConsultation]}>
                <MessageCircle size={14} color="#FFF" />
              </View>
              <Text style={styles.timelineStepText}>
                Provider conducts consultation with you
              </Text>
            </View>
          )}
          <View style={styles.timelineStep}>
            <View style={styles.timelineNumber}>
              <Text style={styles.timelineNumberText}>
                {consultationRequired ? '3' : '2'}
              </Text>
            </View>
            <Text style={styles.timelineStepText}>
              Provider reviews order and may adjust price
            </Text>
          </View>
          <View style={styles.timelineStep}>
            <View style={styles.timelineNumber}>
              <Text style={styles.timelineNumberText}>
                {consultationRequired ? '4' : '3'}
              </Text>
            </View>
            <Text style={styles.timelineStepText}>
              Provider marks order as received - work begins
            </Text>
          </View>
          <View style={styles.timelineStep}>
            <View style={[styles.timelineNumber, styles.timelineComplete]}>
              <CheckCircle size={14} color="#FFF" />
            </View>
            <Text style={styles.timelineStepText}>
              Order completed - escrow released to provider
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.checkoutButton]}
          onPress={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Lock size={20} color="#FFF" />
              <Text style={styles.checkoutButtonText}>Pay ${estimatedPrice.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        By completing this payment, you agree to our Terms of Service. Your payment will be
        held in escrow and released to the provider upon order completion.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  priceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  escrowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  consultationSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  consultationDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  requiredBadge: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  requiredText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  consultationOptions: {
    gap: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 10,
  },
  optionButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  optionText: {
    fontSize: 15,
    color: '#6B7280',
  },
  optionTextSelected: {
    color: '#1F2937',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  timeline: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  timelineSteps: {
    gap: 12,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConsultation: {
    backgroundColor: '#8B5CF6',
  },
  timelineComplete: {
    backgroundColor: '#059669',
  },
  timelineNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  timelineStepText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
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
  checkoutButton: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
