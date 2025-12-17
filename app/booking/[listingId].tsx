import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Listing } from '@/types/database';
import { BookingCalendar } from '@/components/BookingCalendar';
import { Button } from '@/components/Button';
import { StripePaymentSheet } from '@/components/StripePaymentSheet';
import { PaymentConfirmation } from '@/components/PaymentConfirmation';
import DepositPaymentOption from '@/components/DepositPaymentOption';
import { ArrowLeft, Clock, MapPin, DollarSign, CreditCard, CheckCircle, Shield, Info, Wallet } from 'lucide-react-native';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

type BookingStep = 'datetime' | 'payment' | 'confirmation';

export default function BookingScreen() {
  const { listingId } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<Listing | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const [step, setStep] = useState<BookingStep>('datetime');
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'wallet' | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [balanceAmount, setBalanceAmount] = useState<number>(0);
  const [bookingId, setBookingId] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    if (listingId) {
      fetchListingDetails();
    }
  }, [listingId]);

  const fetchListingDetails = async () => {
    const { data: listingData, error } = await supabase
      .from('service_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingData && !error) {
      setListing(listingData as any);
      setLocation(listingData.location || '');

      const { data: providerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', listingData.provider_id)
        .single();

      if (providerData) {
        setProvider(providerData);
      }
    }

    setLoading(false);
  };

  const timeSlots = [
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
  ];

  const canProceedToPayment = selectedDate && selectedTime && location.trim();

  const handleProceedToPayment = () => {
    if (!canProceedToPayment) {
      Alert.alert('Missing Information', 'Please select a date, time, and confirm the location');
      return;
    }
    setStep('payment');
  };

  const handleCompleteBooking = async () => {
    if (!paymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    if (!profile || !listing || !provider || !selectedDate) return;

    setLoading(true);
    setProcessing(true);

    try {
      const paymentAmount = paymentType === 'deposit' ? depositAmount : listing.base_price;
      const platformFee = listing.base_price * 0.10;
      const providerPayout = listing.base_price - platformFee;

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: profile.id,
          provider_id: provider.id,
          listing_id: listing.id,
          title: listing.title,
          description: notes || listing.description,
          scheduled_date: selectedDate.toISOString().split('T')[0],
          scheduled_time: selectedTime,
          location: location,
          price: listing.base_price,
          platform_fee: platformFee,
          provider_payout: providerPayout,
          status: 'PendingApproval',
          provider_response_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          payment_status: 'Pending',
          deposit_amount: paymentType === 'deposit' ? depositAmount : null,
          balance_due: paymentType === 'deposit' ? balanceAmount : null,
        })
        .select()
        .single();

      if (bookingError || !bookingData) {
        throw new Error('Failed to create booking');
      }

      setBookingId(bookingData.id);

      if (paymentMethod === 'stripe') {
        const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${paymentType === 'deposit' ? 'create-deposit-payment' : 'create-payment-intent'}`;
        const { data: session } = await supabase.auth.getSession();

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentAmount,
            bookingId: bookingData.id,
            paymentMethod: 'card',
            ...(paymentType === 'deposit' && {
              depositAmount,
              balanceAmount,
            }),
          }),
        });

        const paymentData = await response.json();

        if (paymentData.error) {
          throw new Error(paymentData.error);
        }

        setPaymentIntentId(paymentData.paymentIntentId);
        setClientSecret(paymentData.clientSecret);
        setStep('confirmation');
      } else if (paymentMethod === 'wallet') {
        const { data: walletData } = await supabase
          .from('wallets')
          .select('available_balance')
          .eq('user_id', profile.id)
          .single();

        if (!walletData || walletData.available_balance < paymentAmount) {
          throw new Error('Insufficient wallet balance');
        }

        await supabase.from('transactions').insert({
          wallet_id: walletData.id,
          transaction_type: 'Payment',
          amount: -paymentAmount,
          status: 'Completed',
          description: `Payment for ${listing.title}`,
          booking_id: bookingData.id,
        });

        await supabase
          .from('bookings')
          .update({ payment_status: 'Completed' })
          .eq('id', bookingData.id);

        setStep('confirmation');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (intentId: string) => {
    try {
      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/confirm-payment`;
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: intentId,
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setStep('confirmation');
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Payment confirmation failed.');
    }
  };

  if (loading && !listing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Service</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!listing || !provider) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  const renderDateTimeStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <BookingCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Time</Text>
        <View style={styles.timeSlots}>
          {timeSlots.map((time) => (
            <TouchableOpacity
              key={time}
              style={[styles.timeSlot, selectedTime === time && styles.timeSlotSelected]}
              onPress={() => setSelectedTime(time)}
            >
              <Clock
                size={16}
                color={selectedTime === time ? colors.white : colors.textSecondary}
              />
              <Text
                style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextSelected]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Location</Text>
        <View style={styles.locationInput}>
          <MapPin size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Enter service address"
            placeholderTextColor={colors.textLight}
            value={location}
            onChangeText={setLocation}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Any special requirements or instructions..."
          placeholderTextColor={colors.textLight}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      <Text style={styles.smsOptInText}>
        I agree to receive SMS alerts about jobs, bookings, and account updates. Msg & data rates may apply. Reply STOP to opt out.
      </Text>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}>
        <Button
          title="Continue to Payment"
          onPress={handleProceedToPayment}
          disabled={!canProceedToPayment}
        />
      </View>
    </ScrollView>
  );

  const handleStripePaymentSuccess = async () => {
    try {
      await handlePaymentSuccess(paymentIntentId);
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Payment confirmation failed.');
    }
  };

  const handleStripePaymentError = (error: string) => {
    Alert.alert('Payment Failed', error);
    setProcessing(false);
  };

  const handleDepositSelection = (
    type: 'full' | 'deposit',
    deposit?: number,
    balance?: number
  ) => {
    setPaymentType(type);
    if (type === 'deposit' && deposit && balance) {
      setDepositAmount(deposit);
      setBalanceAmount(balance);
    }
  };

  const paymentAmount = paymentType === 'deposit' ? depositAmount : listing.base_price;

  const renderPaymentStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>{listing.title}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Provider</Text>
            <Text style={styles.summaryValue}>{provider.full_name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>
              {selectedDate?.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{selectedTime}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValue}>{location}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryLabelTotal}>Total</Text>
            <Text style={styles.summaryValueTotal}>{formatCurrency(listing.base_price)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <DepositPaymentOption
          providerId={provider.id}
          totalAmount={listing.base_price}
          onSelect={handleDepositSelection}
          selectedType={paymentType}
        />
      </View>

      {clientSecret ? (
        <View style={styles.section}>
          <StripePaymentSheet
            clientSecret={clientSecret}
            amount={paymentAmount}
            customerName={profile?.full_name}
            onPaymentSuccess={handleStripePaymentSuccess}
            onPaymentError={handleStripePaymentError}
          />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <View style={styles.securityBanner}>
              <Shield size={20} color={colors.success} />
              <View style={styles.securityContent}>
                <Text style={styles.securityText}>
                  Secure payment with 256-bit encryption. Funds held in escrow until service completion.
                </Text>
              </View>
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
                <Text style={styles.paymentOptionSubtitle}>
                  Pay securely with Stripe • Apple Pay & Google Pay available
                </Text>
              </View>
              {paymentMethod === 'stripe' && (
                <CheckCircle size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'wallet' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('wallet')}
            >
              <Wallet
                size={24}
                color={paymentMethod === 'wallet' ? colors.primary : colors.textSecondary}
              />
              <View style={styles.paymentOptionContent}>
                <Text
                  style={[
                    styles.paymentOptionTitle,
                    paymentMethod === 'wallet' && styles.paymentOptionTitleSelected,
                  ]}
                >
                  Wallet Balance
                </Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Use your wallet funds • Instant confirmation
                </Text>
              </View>
              {paymentMethod === 'wallet' && (
                <CheckCircle size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.paymentSummary}>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {paymentType === 'deposit' ? 'Deposit Amount' : 'Total Amount'}
                </Text>
                <Text style={styles.paymentSummaryValue}>
                  ${paymentAmount.toFixed(2)}
                </Text>
              </View>
              {paymentType === 'deposit' && (
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>Balance Due Later</Text>
                  <Text style={styles.paymentSummaryValueSecondary}>
                    ${balanceAmount.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.infoBox}>
              <Info size={16} color={colors.primary} />
              <Text style={styles.infoText}>
                Your payment is protected. Funds are held securely in escrow and only released to the provider after successful service completion.
              </Text>
            </View>

            <Text style={styles.smsOptInText}>
              I agree to receive SMS alerts about jobs, bookings, and account updates. Msg & data rates may apply. Reply STOP to opt out.
            </Text>
          </View>
        </>
      )}

      {!clientSecret && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}>
          <Button title="Back" onPress={() => setStep('datetime')} variant="outline" disabled={processing} />
          {processing ? (
            <View style={[styles.payButton, styles.processingContainer]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.processingText}>Processing Payment...</Text>
            </View>
          ) : (
            <Button
              title={`Continue to Payment`}
              onPress={handleCompleteBooking}
              disabled={!paymentMethod || loading}
              loading={loading}
              style={styles.payButton}
            />
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderConfirmationStep = () => (
    <PaymentConfirmation
      status="success"
      amount={listing.base_price}
      transactionId={paymentIntentId}
      bookingId={bookingId}
      serviceName={listing.title}
      providerName={provider.full_name}
      date={selectedDate?.toLocaleDateString()}
      time={selectedTime}
      customTitle="Booking Confirmed!"
      customDescription={`Your payment has been processed and held securely. Your booking is now pending approval from ${provider.full_name}. They have 24 hours to accept your request.`}
      showReceipt={true}
      showContactProvider={true}
      onContactProvider={() => router.push(`/chat/${provider.id}`)}
      onViewBooking={() => router.push('/bookings')}
      onClose={() => router.push('/(tabs)')}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 'confirmation' ? router.push('/(tabs)') : router.back())}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'datetime' && 'Select Date & Time'}
          {step === 'payment' && 'Payment'}
          {step === 'confirmation' && 'Confirmed'}
        </Text>
      </View>

      {step !== 'confirmation' && (
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.progressStepActive]} />
          <View style={[styles.progressStep, step === 'payment' && styles.progressStepActive]} />
        </View>
      )}

      {step === 'datetime' && renderDateTimeStep()}
      {step === 'payment' && renderPaymentStep()}
      {step === 'confirmation' && renderConfirmationStep()}
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
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
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
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  timeSlotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  timeSlotTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },
  textArea: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
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
  summaryRowTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  summaryLabelTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  summaryValueTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  paymentNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
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
    marginBottom: spacing.xs,
  },
  paymentOptionTitleSelected: {
    color: colors.primary,
  },
  paymentOptionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  payButton: {
    flex: 2,
    minWidth: 0,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  processingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  confirmationContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  confirmationTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  confirmationCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  confirmationCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  confirmationLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  confirmationValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  statusBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  confirmationActions: {
    width: '100%',
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  securityContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  securityText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  paymentSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  paymentSummaryLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  paymentSummaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  paymentSummaryValueSecondary: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginLeft: spacing.sm,
  },
  smsOptInText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlign: 'left',
  },
});
