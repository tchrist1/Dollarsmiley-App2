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
import { Lock, AlertCircle, CreditCard } from 'lucide-react-native';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { useStripe } from '@stripe/stripe-react-native';

interface CustomServiceCheckoutProps {
  orderId: string;
  customerId: string;
  providerId: string;
  estimatedPrice: number;
  productType: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomServiceCheckout({
  orderId,
  customerId,
  providerId,
  estimatedPrice,
  productType,
  onSuccess,
  onCancel,
}: CustomServiceCheckoutProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const result = await CustomServicePayments.createAuthorizationHold({
        productionOrderId: orderId,
        customerId,
        providerId,
        amount: estimatedPrice,
        description: `Custom ${productType}`,
        metadata: {
          order_type: 'custom_service',
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

      Alert.alert(
        'Authorization Successful',
        'Your payment has been authorized. The provider will review your requirements and confirm the final price.',
        [
          {
            text: 'OK',
            onPress: onSuccess,
          },
        ]
      );
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
        <Text style={styles.title}>Payment Authorization</Text>
        <Text style={styles.subtitle}>
          We'll place a hold on your card for the estimated amount
        </Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Estimated Price</Text>
        <Text style={styles.priceValue}>${estimatedPrice.toFixed(2)}</Text>
        <View style={styles.estimatedBadge}>
          <Text style={styles.estimatedText}>This is an estimate</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Lock size={20} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Secure Authorization Hold</Text>
            <Text style={styles.infoText}>
              This places a temporary hold on your card but doesn't charge you yet. The actual
              charge happens after the provider confirms your order.
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <AlertCircle size={20} color="#F59E0B" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Price May Change</Text>
            <Text style={styles.infoText}>
              After reviewing your requirements, the provider may propose a different price. You'll
              need to approve any price changes before work begins.
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <CreditCard size={20} color="#059669" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>When You're Charged</Text>
            <Text style={styles.infoText}>
              Your card will be charged when the provider marks your order as received and begins
              production. Authorization holds last for 7 days.
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
              Provider reviews your requirements
            </Text>
          </View>
          <View style={styles.timelineStep}>
            <View style={styles.timelineNumber}>
              <Text style={styles.timelineNumberText}>2</Text>
            </View>
            <Text style={styles.timelineStepText}>
              Provider proposes final price
            </Text>
          </View>
          <View style={styles.timelineStep}>
            <View style={styles.timelineNumber}>
              <Text style={styles.timelineNumberText}>3</Text>
            </View>
            <Text style={styles.timelineStepText}>
              You approve the final price
            </Text>
          </View>
          <View style={styles.timelineStep}>
            <View style={styles.timelineNumber}>
              <Text style={styles.timelineNumberText}>4</Text>
            </View>
            <Text style={styles.timelineStepText}>
              Payment is captured and work begins
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
              <Text style={styles.checkoutButtonText}>Authorize Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        By authorizing this payment, you agree to our Terms of Service and understand that your
        card will be charged when the provider confirms your order.
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
  estimatedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  estimatedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
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
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
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
