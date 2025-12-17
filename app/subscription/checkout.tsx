import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

let useStripe: any = () => ({
  initPaymentSheet: async () => ({ error: null }),
  presentPaymentSheet: async () => ({ error: null }),
});

if (Platform.OS !== 'web') {
  const stripe = require('@stripe/stripe-react-native');
  useStripe = stripe.useStripe;
}
import {
  CreditCard,
  Shield,
  Check,
  Lock,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSubscriptionPlan,
  formatPrice,
  calculateYearlySavings,
  type PlanName,
  type BillingCycle,
} from '@/lib/stripe-subscription-config';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [savings, setSavings] = useState(0);
  const [paymentReady, setPaymentReady] = useState(false);

  const planName = params.plan as PlanName;
  const billingCycle = params.billing as BillingCycle;

  useEffect(() => {
    loadPlanDetails();
  }, [planName]);

  const loadPlanDetails = async () => {
    setLoading(true);
    try {
      const planData = await getSubscriptionPlan(planName);
      setPlan(planData);

      if (planData && planName !== 'Free') {
        const savingsAmount = await calculateYearlySavings(planName);
        setSavings(savingsAmount);
      }

      // Initialize payment sheet
      await initializePaymentSheet();
    } catch (error) {
      console.error('Error loading plan:', error);
      Alert.alert('Error', 'Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  const initializePaymentSheet = async () => {
    if (!user?.id || !planName || planName === 'Free') {
      return;
    }

    try {
      // Call edge function to create subscription
      const { data, error } = await supabase.functions.invoke(
        'create-subscription',
        {
          body: {
            planName,
            billingCycle,
          },
        }
      );

      if (error) throw error;

      const { clientSecret, ephemeralKey, customerId } = data;

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Dollarsmiley',
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          email: user.email,
        },
      });

      if (initError) {
        console.error('Payment sheet init error:', initError);
        Alert.alert('Error', 'Failed to initialize payment');
      } else {
        setPaymentReady(true);
      }
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      Alert.alert('Error', error.message || 'Failed to initialize payment');
    }
  };

  const handleSubscribe = async () => {
    if (!paymentReady) {
      Alert.alert('Error', 'Payment is not ready yet');
      return;
    }

    setProcessing(true);

    try {
      // Present payment sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', paymentError.message);
        }
        setProcessing(false);
        return;
      }

      // Payment successful
      Alert.alert(
        'Success!',
        `You've successfully subscribed to the ${planName} plan!`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/subscription/success');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'Payment failed');
      setProcessing(false);
    }
  };

  const getPrice = () => {
    if (!plan) return 0;
    return billingCycle === 'Yearly' ? plan.price_yearly : plan.price_monthly;
  };

  const getMonthlyEquivalent = () => {
    const price = getPrice();
    return billingCycle === 'Yearly' ? price / 12 : price;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Plan Not Found</Text>
        <Text style={styles.errorText}>
          The selected plan could not be loaded.
        </Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Checkout',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.planInfo}>
            <Text style={styles.planName}>{plan.display_name} Plan</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </View>

          <View style={styles.divider} />

          {/* Billing Cycle */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Billing Cycle</Text>
            <Text style={styles.summaryValue}>{billingCycle}</Text>
          </View>

          {/* Price */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(getPrice())}/{billingCycle === 'Yearly' ? 'year' : 'month'}
            </Text>
          </View>

          {/* Monthly Equivalent for Yearly */}
          {billingCycle === 'Yearly' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSmall}>Monthly equivalent</Text>
              <Text style={styles.summaryValueSmall}>
                {formatPrice(getMonthlyEquivalent())}/month
              </Text>
            </View>
          )}

          {/* Savings */}
          {billingCycle === 'Yearly' && savings > 0 && (
            <View style={styles.savingsRow}>
              <Check size={20} color={colors.success} />
              <Text style={styles.savingsText}>
                You save {formatPrice(savings)} with yearly billing
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Due Today</Text>
            <Text style={styles.totalValue}>{formatPrice(getPrice())}</Text>
          </View>

          {/* Trial Notice */}
          <View style={styles.trialNotice}>
            <Shield size={20} color={colors.primary} />
            <Text style={styles.trialText}>
              Start your 14-day free trial. Cancel anytime.
            </Text>
          </View>
        </View>

        {/* Features Included */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>What's Included</Text>
          <View style={styles.featuresList}>
            {Array.isArray(plan.features) &&
              plan.features.slice(0, 8).map((feature: string, index: number) => (
                <View key={index} style={styles.featureRow}>
                  <Check size={18} color={colors.success} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Payment Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (!paymentReady || processing) && styles.payButtonDisabled,
          ]}
          onPress={handleSubscribe}
          disabled={!paymentReady || processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <CreditCard size={24} color={colors.white} />
              <Text style={styles.payButtonText}>
                {paymentReady ? 'Subscribe Now' : 'Loading...'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Lock size={16} color={colors.textSecondary} />
          <Text style={styles.securityText}>
            Secure payment powered by Stripe. Your payment information is encrypted and secure.
          </Text>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy.
            Your subscription will automatically renew unless cancelled before the renewal date.
          </Text>
        </View>

        {/* Money-Back Guarantee */}
        <View style={styles.guaranteeCard}>
          <Shield size={32} color={colors.success} />
          <Text style={styles.guaranteeTitle}>30-Day Money-Back Guarantee</Text>
          <Text style={styles.guaranteeText}>
            Not satisfied? Get a full refund within 30 days, no questions asked.
          </Text>
        </View>

        {/* Support */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => {
            Alert.alert(
              'Need Help?',
              'Contact us at support@dollarsmiley.com or call 1-800-DOLLAR-1'
            );
          }}
        >
          <Text style={styles.supportButtonText}>Need help? Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  errorButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  planInfo: {
    marginBottom: spacing.md,
  },
  planName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  planDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  summaryLabelSmall: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValueSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  savingsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  trialNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  trialText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  featuresCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  securityText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  termsSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  termsText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  guaranteeCard: {
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  guaranteeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginTop: spacing.sm,
  },
  guaranteeText: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  supportButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  supportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
});
