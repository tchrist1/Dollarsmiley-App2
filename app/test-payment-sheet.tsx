import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StripePaymentSheet } from '@/components/StripePaymentSheet';
import { Button } from '@/components/Button';
import { ArrowLeft, CreditCard, DollarSign } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

type TestStep = 'setup' | 'payment' | 'result';

export default function TestPaymentSheetScreen() {
  const { profile } = useAuth();
  const [step, setStep] = useState<TestStep>('setup');
  const [amount, setAmount] = useState('25.00');
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const createTestPayment = async () => {
    if (!profile) {
      Alert.alert('Authentication Required', 'Please login to test payments');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Platform Limitation',
        'Stripe Payment Sheet is not available on web. Please test on a mobile device or simulator.'
      );
      return;
    }

    setLoading(true);

    try {
      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`;
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountValue,
          bookingId: 'test-payment-' + Date.now(),
          paymentMethod: 'card',
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.clientSecret) {
        throw new Error('No client secret received');
      }

      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create payment intent');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentResult({
      success: true,
      message: 'Payment completed successfully!',
    });
    setStep('result');
  };

  const handlePaymentError = (error: string) => {
    setPaymentResult({
      success: false,
      message: error,
    });
    setStep('result');
  };

  const resetTest = () => {
    setStep('setup');
    setAmount('25.00');
    setClientSecret('');
    setPaymentResult(null);
  };

  const renderSetupStep = () => (
    <View style={styles.section}>
      <View style={styles.iconContainer}>
        <DollarSign size={48} color={colors.primary} />
      </View>

      <Text style={styles.title}>Test Stripe Payment Sheet</Text>
      <Text style={styles.description}>
        Enter an amount to test the Stripe payment flow. Use test card numbers to simulate different
        scenarios.
      </Text>

      <View style={styles.amountContainer}>
        <Text style={styles.label}>Test Amount</Text>
        <View style={styles.amountInput}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
          />
        </View>
      </View>

      <View style={styles.testCardsContainer}>
        <Text style={styles.testCardsTitle}>Test Card Numbers</Text>
        <View style={styles.testCard}>
          <Text style={styles.testCardNumber}>4242 4242 4242 4242</Text>
          <Text style={styles.testCardLabel}>Success</Text>
        </View>
        <View style={styles.testCard}>
          <Text style={styles.testCardNumber}>4000 0000 0000 0002</Text>
          <Text style={styles.testCardLabel}>Card Declined</Text>
        </View>
        <View style={styles.testCard}>
          <Text style={styles.testCardNumber}>4000 0025 0000 3155</Text>
          <Text style={styles.testCardLabel}>Requires Authentication</Text>
        </View>
        <Text style={styles.testCardNote}>Use any future expiry date and any 3-digit CVC</Text>
      </View>

      <Button
        title="Create Test Payment"
        onPress={createTestPayment}
        loading={loading}
        style={styles.createButton}
      />

      {Platform.OS === 'web' && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Payment Sheet is not available on web platform. Please test on iOS or Android.
          </Text>
        </View>
      )}
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.section}>
      <StripePaymentSheet
        clientSecret={clientSecret}
        amount={parseFloat(amount)}
        customerName={profile?.full_name}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />

      <Button
        title="Cancel Test"
        variant="outline"
        onPress={resetTest}
        style={styles.cancelButton}
      />
    </View>
  );

  const renderResultStep = () => (
    <View style={styles.section}>
      <View
        style={[
          styles.resultIconContainer,
          paymentResult?.success ? styles.successContainer : styles.errorContainer,
        ]}
      >
        <Text style={styles.resultIcon}>{paymentResult?.success ? '✓' : '✗'}</Text>
      </View>

      <Text style={styles.resultTitle}>
        {paymentResult?.success ? 'Payment Successful!' : 'Payment Failed'}
      </Text>

      <Text style={styles.resultMessage}>{paymentResult?.message}</Text>

      {paymentResult?.success && (
        <View style={styles.resultDetailsCard}>
          <Text style={styles.resultDetailsTitle}>Transaction Details</Text>
          <View style={styles.resultDetailRow}>
            <Text style={styles.resultDetailLabel}>Amount</Text>
            <Text style={styles.resultDetailValue}>${amount}</Text>
          </View>
          <View style={styles.resultDetailRow}>
            <Text style={styles.resultDetailLabel}>Status</Text>
            <Text style={[styles.resultDetailValue, styles.successText]}>Completed</Text>
          </View>
          <View style={styles.resultDetailRow}>
            <Text style={styles.resultDetailLabel}>Date</Text>
            <Text style={styles.resultDetailValue}>{new Date().toLocaleString()}</Text>
          </View>
        </View>
      )}

      <View style={styles.resultActions}>
        <Button title="Test Again" onPress={resetTest} style={styles.actionButton} />
        <Button
          title="Back to Home"
          variant="outline"
          onPress={() => router.push('/(tabs)')}
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 'setup' ? router.back() : resetTest())}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Sheet Test</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'setup' && renderSetupStep()}
        {step === 'payment' && renderPaymentStep()}
        {step === 'result' && renderResultStep()}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>About This Test</Text>
          <Text style={styles.infoText}>
            This test screen demonstrates the Stripe Payment Sheet integration. It creates a real
            payment intent on your Stripe test account and allows you to test the complete payment
            flow.
          </Text>
          <Text style={styles.infoText}>
            All payments made here are in test mode and will not charge real cards.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
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
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  amountContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  currencySymbol: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  testCardsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  testCardsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  testCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  testCardNumber: {
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.text,
  },
  testCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  testCardNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  createButton: {
    marginBottom: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.lg,
  },
  warningBox: {
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 20,
  },
  resultIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  successContainer: {
    backgroundColor: colors.success + '20',
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
  },
  resultIcon: {
    fontSize: 48,
    color: colors.white,
  },
  resultTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  resultMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  resultDetailsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  resultDetailsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  resultDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultDetailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  resultDetailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  successText: {
    color: colors.success,
  },
  resultActions: {
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
  infoBox: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
});
