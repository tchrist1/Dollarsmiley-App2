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
  Star,
  TrendingUp,
  Eye,
  Zap,
  Check,
  CreditCard,
  ArrowLeft,
  Clock,
  Target,
  BarChart3,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFeaturedPricing,
  checkFeaturedEligibility,
  createFeaturedPaymentIntent,
  activateFeaturedListing,
  formatFeaturedDuration,
  type FeaturedDuration,
  type FeaturedPricing,
} from '@/lib/featured-listings';
import { formatPrice } from '@/lib/stripe-subscription-config';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function FeatureListingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const listingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<FeaturedDuration>('14');
  const [pricing, setPricing] = useState<FeaturedPricing[]>([]);
  const [listing, setListing] = useState<any>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [featuredId, setFeaturedId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [listingId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const pricingData = getFeaturedPricing();
      setPricing(pricingData);

      // Check eligibility
      const eligibilityCheck = await checkFeaturedEligibility(user!.id, listingId);
      setEligible(eligibilityCheck.eligible);
      setEligibilityReason(eligibilityCheck.reason || '');

      if (eligibilityCheck.eligible) {
        await initializePayment(selectedDuration);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load feature listing options');
    } finally {
      setLoading(false);
    }
  };

  const initializePayment = async (duration: FeaturedDuration) => {
    if (!user?.id) return;

    try {
      const result = await createFeaturedPaymentIntent(user.id, listingId, duration);

      if (!result) {
        throw new Error('Failed to create payment intent');
      }

      setFeaturedId(result.featuredId);

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Dollarsmiley',
        paymentIntentClientSecret: result.clientSecret,
        allowsDelayedPaymentMethods: false,
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

  const handleDurationSelect = async (duration: FeaturedDuration) => {
    setSelectedDuration(duration);
    setPaymentReady(false);
    await initializePayment(duration);
  };

  const handlePurchase = async () => {
    if (!paymentReady || !featuredId) {
      Alert.alert('Error', 'Payment is not ready yet');
      return;
    }

    setProcessing(true);

    try {
      const { error: paymentError, paymentIntent } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', paymentError.message);
        }
        setProcessing(false);
        return;
      }

      // Activate featured listing
      const { success, error } = await activateFeaturedListing(
        featuredId,
        paymentIntent!.id
      );

      if (!success) {
        throw new Error(error || 'Failed to activate featured listing');
      }

      Alert.alert(
        'Success!',
        'Your listing is now featured! It will appear at the top of search results.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error.message || 'Purchase failed');
      setProcessing(false);
    }
  };

  const getSelectedPricing = () => {
    return pricing.find((p) => p.duration === selectedDuration);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!eligible) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Feature Listing',
            headerShown: true,
          }}
        />
        <View style={styles.ineligibleContainer}>
          <Star size={64} color={colors.textSecondary} />
          <Text style={styles.ineligibleTitle}>Not Eligible</Text>
          <Text style={styles.ineligibleText}>{eligibilityReason}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const selectedPrice = getSelectedPricing();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Feature Your Listing',
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
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Star size={48} color={colors.warning} />
          </View>
          <Text style={styles.heroTitle}>Boost Your Visibility</Text>
          <Text style={styles.heroDescription}>
            Get your listing featured at the top of search results and increase your
            bookings by up to 300%
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>What You Get</Text>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <TrendingUp size={24} color={colors.success} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Top Placement</Text>
              <Text style={styles.benefitText}>
                Your listing appears at the very top of search results
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Eye size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>More Visibility</Text>
              <Text style={styles.benefitText}>
                Get 10x more views compared to regular listings
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Zap size={24} color={colors.warning} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Premium Badge</Text>
              <Text style={styles.benefitText}>
                Stand out with a featured badge on your listing
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <BarChart3 size={24} color={colors.info} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Performance Analytics</Text>
              <Text style={styles.benefitText}>
                Track impressions, clicks, and conversion rates
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Options */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Choose Duration</Text>

          {pricing.map((option) => (
            <TouchableOpacity
              key={option.duration}
              style={[
                styles.pricingCard,
                selectedDuration === option.duration && styles.pricingCardSelected,
              ]}
              onPress={() => handleDurationSelect(option.duration)}
            >
              {option.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}

              <View style={styles.pricingHeader}>
                <View style={styles.pricingInfo}>
                  <Text style={styles.pricingDuration}>
                    {formatFeaturedDuration(option.days)}
                  </Text>
                  <Text style={styles.pricingSubtext}>
                    {formatPrice(option.pricePerDay)}/day
                  </Text>
                </View>

                <View style={styles.pricingPrice}>
                  <Text style={styles.priceAmount}>{formatPrice(option.price)}</Text>
                  {selectedDuration === option.duration && (
                    <View style={styles.selectedIcon}>
                      <Check size={20} color={colors.white} />
                    </View>
                  )}
                </View>
              </View>

              {option.savings > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>
                    Save {formatPrice(option.savings)}
                  </Text>
                </View>
              )}

              <View style={styles.pricingFeatures}>
                <View style={styles.featureRow}>
                  <Check size={16} color={colors.success} />
                  <Text style={styles.featureText}>
                    Featured for {option.days} days
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <Check size={16} color={colors.success} />
                  <Text style={styles.featureText}>Premium badge</Text>
                </View>
                <View style={styles.featureRow}>
                  <Check size={16} color={colors.success} />
                  <Text style={styles.featureText}>Performance analytics</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Preview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Expected Results</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Eye size={32} color={colors.primary} />
              <Text style={styles.statValue}>10x</Text>
              <Text style={styles.statLabel}>More Views</Text>
            </View>

            <View style={styles.statCard}>
              <Target size={32} color={colors.success} />
              <Text style={styles.statValue}>300%</Text>
              <Text style={styles.statLabel}>More Bookings</Text>
            </View>

            <View style={styles.statCard}>
              <Clock size={32} color={colors.warning} />
              <Text style={styles.statValue}>24h</Text>
              <Text style={styles.statLabel}>Activation</Text>
            </View>
          </View>
        </View>

        {/* Purchase Button */}
        {selectedPrice && (
          <View style={styles.purchaseSection}>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>
                {formatPrice(selectedPrice.price)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.purchaseButton,
                (!paymentReady || processing) && styles.purchaseButtonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={!paymentReady || processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <CreditCard size={24} color={colors.white} />
                  <Text style={styles.purchaseButtonText}>
                    {paymentReady ? 'Feature My Listing' : 'Loading...'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Your listing will be featured immediately after payment. You can cancel
              anytime within the first 24 hours for a full refund.
            </Text>
          </View>
        )}

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>When does my featured listing start?</Text>
            <Text style={styles.faqAnswer}>
              Your listing becomes featured immediately after payment and will run for
              the selected duration.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I extend my featured period?</Text>
            <Text style={styles.faqAnswer}>
              Yes! You can extend your featured listing at any time before it expires.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What if I'm not satisfied?</Text>
            <Text style={styles.faqAnswer}>
              You can request a full refund within the first 24 hours if you're not
              satisfied with the results.
            </Text>
          </View>
        </View>
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
  ineligibleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  ineligibleTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  ineligibleText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
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
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 96,
    height: 96,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  benefitText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  pricingSection: {
    marginBottom: spacing.lg,
  },
  pricingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  popularText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  pricingInfo: {
    flex: 1,
  },
  pricingDuration: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pricingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  pricingPrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  selectedIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  savingsBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  savingsText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  pricingFeatures: {
    gap: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statsSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  purchaseSection: {
    marginBottom: spacing.lg,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  faqSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  faqItem: {
    marginBottom: spacing.md,
  },
  faqQuestion: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
