import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { Button } from './Button';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { CreditCard, Shield, Lock } from 'lucide-react-native';

let useStripe: any = () => ({
  initPaymentSheet: async () => ({ error: null }),
  presentPaymentSheet: async () => ({ error: null }),
});

if (Platform.OS !== 'web') {
  const stripe = require('@stripe/stripe-react-native');
  useStripe = stripe.useStripe;
}

interface StripePaymentSheetProps {
  clientSecret: string;
  amount: number;
  customerName?: string;
  merchantName?: string;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

export function StripePaymentSheet({
  clientSecret,
  amount,
  customerName,
  merchantName = 'Dollarsmiley',
  onPaymentSuccess,
  onPaymentError,
}: StripePaymentSheetProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);

  useEffect(() => {
    if (clientSecret && !initialized) {
      initializePaymentSheet();
    }
  }, [clientSecret]);

  const initializePaymentSheet = async () => {
    if (!clientSecret) {
      onPaymentError('Payment configuration error');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Web Platform',
        'Stripe Payment Sheet is not available on web. Please use a mobile device or simulator.'
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await initPaymentSheet({
        merchantDisplayName: merchantName,
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: customerName || 'Customer',
        },
        allowsDelayedPaymentMethods: false,
        returnURL: 'dollarsmiley://stripe-redirect',
        appearance: {
          colors: {
            primary: colors.primary,
            background: colors.background,
            componentBackground: colors.white,
            componentBorder: colors.border,
            componentDivider: colors.border,
            primaryText: colors.text,
            secondaryText: colors.textSecondary,
            componentText: colors.text,
            placeholderText: colors.textLight,
          },
          shapes: {
            borderRadius: 12,
            borderWidth: 1,
          },
        },
      });

      if (error) {
        onPaymentError(error.message);
      } else {
        setInitialized(true);
        setPaymentReady(true);
      }
    } catch (error: any) {
      onPaymentError(error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentSheet = async () => {
    if (!initialized) {
      Alert.alert('Please Wait', 'Payment sheet is still loading...');
      return;
    }

    setLoading(true);

    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          setLoading(false);
        } else {
          onPaymentError(error.message);
        }
      } else {
        onPaymentSuccess();
      }
    } catch (error: any) {
      onPaymentError(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !paymentReady) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing secure payment...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <CreditCard size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>Secure Payment</Text>
        <Text style={styles.amount}>${amount.toFixed(2)}</Text>
      </View>

      <View style={styles.securityBadges}>
        <View style={styles.badge}>
          <Shield size={16} color={colors.success} />
          <Text style={styles.badgeText}>PCI Compliant</Text>
        </View>
        <View style={styles.badge}>
          <Lock size={16} color={colors.success} />
          <Text style={styles.badgeText}>256-bit Encryption</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Payment Protection</Text>
        <Text style={styles.infoText}>
          Your payment is secured with Stripe and held in escrow until the service is completed. You're protected by our satisfaction guarantee.
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureDot}>•</Text>
          <Text style={styles.featureText}>Your card details are never stored on our servers</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureDot}>•</Text>
          <Text style={styles.featureText}>Instant payment confirmation</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureDot}>•</Text>
          <Text style={styles.featureText}>Full refund if service is not provided</Text>
        </View>
      </View>

      <Button
        title="Proceed to Payment"
        onPress={openPaymentSheet}
        loading={loading}
        disabled={!paymentReady}
        style={styles.payButton}
      />

      <Text style={styles.disclaimer}>
        By continuing, you agree to our Terms of Service and acknowledge our Privacy Policy.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  amount: {
    fontSize: fontSize.xxxl || 32,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  securityBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  features: {
    marginBottom: spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  featureDot: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  featureText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  payButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
});
