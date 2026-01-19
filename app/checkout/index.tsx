import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { CartService } from '@/lib/cart';
import { ShippingService } from '@/lib/shipping';
import ShippingRateSelector from '@/components/ShippingRateSelector';
import { Button } from '@/components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { ArrowLeft, MapPin, Package, CreditCard, Shield } from 'lucide-react-native';

type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

export default function CheckoutScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  const [selectedShippingRates, setSelectedShippingRates] = useState<Map<string, any>>(
    new Map()
  );
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'wallet' | null>(null);

  useEffect(() => {
    if (user) {
      loadCheckoutData();
    }
  }, [user]);

  async function loadCheckoutData() {
    if (!user) return;

    setLoading(true);
    try {
      const items = await CartService.getCartItems(user.id);
      const breakdown = await CartService.getCartPriceBreakdown(user.id);
      const addresses = await ShippingService.getShippingAddresses(user.id);

      setCartItems(items);
      setPriceBreakdown(breakdown);

      if (addresses.length > 0) {
        setShippingAddress(addresses[0]);
      }
    } catch (error) {
      console.error('Error loading checkout data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleShippingRateSelect(itemId: string, rate: any) {
    const updated = new Map(selectedShippingRates);
    updated.set(itemId, rate);
    setSelectedShippingRates(updated);
  }

  function canProceedToPayment() {
    const shippingItems = cartItems.filter(
      (item: any) => item.fulfillment_type === 'Shipping'
    );

    for (const item of shippingItems) {
      if (!selectedShippingRates.has(item.id)) {
        return false;
      }
    }

    return shippingItems.length === 0 || shippingAddress;
  }

  async function handleProceedToPayment() {
    if (!canProceedToPayment()) {
      Alert.alert(
        'Incomplete Information',
        'Please select shipping options for all items requiring shipping'
      );
      return;
    }

    setStep('payment');
  }

  async function handleCompleteOrder() {
    if (!paymentMethod) {
      Alert.alert('Payment Required', 'Please select a payment method');
      return;
    }

    if (!user) return;

    setProcessing(true);
    try {
      const validation = await CartService.validateCart(user.id);
      if (!validation.valid) {
        Alert.alert('Cart Error', validation.errors.join('\n'));
        return;
      }

      const shippingRates = Array.from(selectedShippingRates.entries()).map(
        ([itemId, rate]) => ({
          cart_item_id: itemId,
          carrier: rate.carrier,
          service_type: rate.service_type,
          rate: rate.rate,
          delivery_days: rate.delivery_days,
        })
      );

      const result = await CartService.createOrderFromCart(
        user.id,
        shippingAddress?.id,
        shippingRates
      );

      if (result.success && result.order) {
        Alert.alert(
          'Order Placed!',
          'Your order has been created successfully. Proceed to payment.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/bookings'),
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Package size={64} color="#CCC" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Button title="Browse Services" onPress={() => router.push('/(tabs)/index?filter=Service')} />
        </View>
      </View>
    );
  }

  const renderShippingStep = () => {
    const shippingItems = cartItems.filter(
      (item: any) => item.fulfillment_type === 'Shipping'
    );

    return (
      <ScrollView style={styles.content}>
        {shippingAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.addressCard}>
              <MapPin size={20} color={colors.primary} />
              <View style={styles.addressInfo}>
                <Text style={styles.addressName}>{shippingAddress.full_name}</Text>
                <Text style={styles.addressText}>{shippingAddress.address_line1}</Text>
                {shippingAddress.address_line2 && (
                  <Text style={styles.addressText}>{shippingAddress.address_line2}</Text>
                )}
                <Text style={styles.addressText}>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip_code}
                </Text>
              </View>
            </View>
          </View>
        )}

        {shippingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Options</Text>
            {shippingItems.map((item: any) => (
              <View key={item.id} style={styles.shippingItemCard}>
                <Text style={styles.itemTitle}>{item.listing?.title}</Text>
                <ShippingRateSelector
                  originZip={item.listing?.provider?.location?.zip || '10001'}
                  destinationZip={shippingAddress?.zip_code || '90210'}
                  weightOz={item.listing?.item_weight_oz || 16}
                  dimensions={
                    item.listing?.item_dimensions || {
                      length: 10,
                      width: 8,
                      height: 6,
                    }
                  }
                  fulfillmentWindowDays={item.listing?.fulfillment_window_days || 7}
                  onSelectRate={(rate) => handleShippingRateSelect(item.id, rate)}
                  selectedRate={selectedShippingRates.get(item.id)}
                />
              </View>
            ))}
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}>
          <Button
            title="Continue to Payment"
            onPress={handleProceedToPayment}
            disabled={!canProceedToPayment()}
          />
        </View>
      </ScrollView>
    );
  };

  const renderPaymentStep = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items ({cartItems.length})</Text>
            <Text style={styles.summaryValue}>${priceBreakdown.itemsTotal.toFixed(2)}</Text>
          </View>

          {priceBreakdown.vasTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Add-ons</Text>
              <Text style={styles.summaryValue}>${priceBreakdown.vasTotal.toFixed(2)}</Text>
            </View>
          )}

          {priceBreakdown.shippingTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>
                ${priceBreakdown.shippingTotal.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${priceBreakdown.taxAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>${priceBreakdown.total.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>

        <View style={styles.securityBanner}>
          <Shield size={20} color={colors.success} />
          <Text style={styles.securityText}>
            Secure payment with 256-bit encryption
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'stripe' && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod('stripe')}
        >
          <CreditCard
            size={24}
            color={paymentMethod === 'stripe' ? colors.primary : colors.textSecondary}
          />
          <View style={styles.paymentOptionContent}>
            <Text
              style={[
                styles.paymentOptionTitle,
                paymentMethod === 'stripe' && styles.paymentOptionTitleSelected,
              ]}
            >
              Credit/Debit Card
            </Text>
            <Text style={styles.paymentOptionSubtitle}>Secure payment via Stripe</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}>
        <Button title="Back" onPress={() => setStep('shipping')} variant="outline" />
        <Button
          title="Place Order"
          onPress={handleCompleteOrder}
          disabled={!paymentMethod}
          loading={processing}
          style={styles.placeOrderButton}
        />
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 'shipping' ? router.back() : setStep('shipping'))}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'shipping' && <Text>Shipping</Text>}
          {step === 'payment' && <Text>Payment</Text>}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressStep, styles.progressStepActive]} />
        <View style={[styles.progressStep, step === 'payment' && styles.progressStepActive]} />
      </View>

      {step === 'shipping' && renderShippingStep()}
      {step === 'payment' && renderPaymentStep()}
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
  progressBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
  },
  progressStepActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  addressInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  addressName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  shippingItemCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  itemTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  securityText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
  },
  paymentOptionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  paymentOptionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  paymentOptionTitleSelected: {
    color: colors.primary,
  },
  paymentOptionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'stretch',
  },
  placeOrderButton: {
    flex: 2,
    minWidth: 0,
  },
});
