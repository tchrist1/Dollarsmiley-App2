import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { PaymentConfirmation, PaymentStatus } from '@/components/PaymentConfirmation';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

type DemoScenario = {
  id: string;
  label: string;
  status: PaymentStatus;
  amount: number;
  customTitle?: string;
  customDescription?: string;
  message?: string;
  details?: Array<{ label: string; value: string; highlight?: boolean }>;
};

export default function DemoConfirmationsScreen() {
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);

  const scenarios: DemoScenario[] = [
    {
      id: 'booking-success',
      label: 'Booking Payment Success',
      status: 'success',
      amount: 125.0,
      customTitle: 'Booking Confirmed!',
      customDescription:
        'Your payment has been processed and your booking is confirmed. The provider will be notified shortly.',
      details: [
        { label: 'Transaction ID', value: 'TXN-ABC123456' },
        { label: 'Booking ID', value: 'BK-789012' },
        { label: 'Service', value: 'House Cleaning' },
        { label: 'Provider', value: 'Jane Smith' },
        { label: 'Date & Time', value: 'Dec 15, 2024 at 10:00 AM' },
        { label: 'Amount', value: '$125.00', highlight: true },
        { label: 'Status', value: 'Confirmed', highlight: true },
      ],
    },
    {
      id: 'deposit-success',
      label: 'Deposit Payment Success',
      status: 'partial',
      amount: 50.0,
      customTitle: 'Deposit Received!',
      customDescription:
        'Your deposit of $50 has been processed. The remaining balance of $75 is due before your service date.',
      message:
        'Remember to pay the remaining $75.00 at least 24 hours before your scheduled service.',
      details: [
        { label: 'Deposit Amount', value: '$50.00', highlight: true },
        { label: 'Balance Due', value: '$75.00', highlight: true },
        { label: 'Service', value: 'Event Photography' },
        { label: 'Provider', value: 'John Photographer' },
        { label: 'Due Date', value: 'Dec 20, 2024' },
      ],
    },
    {
      id: 'payment-processing',
      label: 'Payment Processing',
      status: 'pending',
      amount: 200.0,
      message: 'Your bank is verifying the transaction. This typically takes 1-2 minutes.',
    },
    {
      id: 'payment-failed',
      label: 'Payment Failed',
      status: 'failed',
      amount: 150.0,
      message:
        'Payment failed due to insufficient funds. Please check your payment method and try again.',
    },
    {
      id: 'refund-processed',
      label: 'Refund Processed',
      status: 'refunded',
      amount: 175.0,
      customDescription:
        'Your refund has been processed successfully. The amount will be credited to your original payment method within 5-10 business days.',
      message: 'Refund reason: Service cancelled by provider',
      details: [
        { label: 'Original Amount', value: '$175.00' },
        { label: 'Refund Amount', value: '$175.00', highlight: true },
        { label: 'Refund Date', value: new Date().toLocaleDateString() },
        { label: 'Expected in Account', value: '5-10 business days' },
      ],
    },
    {
      id: 'wallet-top-up',
      label: 'Wallet Top-up Success',
      status: 'success',
      amount: 100.0,
      customTitle: 'Wallet Topped Up!',
      customDescription: 'Your wallet has been successfully credited with $100.00',
      details: [
        { label: 'Previous Balance', value: '$50.00' },
        { label: 'Amount Added', value: '$100.00', highlight: true },
        { label: 'New Balance', value: '$150.00', highlight: true },
        { label: 'Transaction ID', value: 'WLT-456789' },
      ],
    },
    {
      id: 'subscription-success',
      label: 'Subscription Payment Success',
      status: 'success',
      amount: 29.99,
      customTitle: 'Subscription Activated!',
      customDescription:
        'Your Premium subscription is now active. Enjoy unlimited access to all features.',
      details: [
        { label: 'Plan', value: 'Premium Monthly' },
        { label: 'Amount', value: '$29.99', highlight: true },
        { label: 'Billing Cycle', value: 'Monthly' },
        { label: 'Next Payment', value: 'Jan 15, 2025' },
        { label: 'Status', value: 'Active', highlight: true },
      ],
    },
    {
      id: 'balance-payment',
      label: 'Balance Payment Success',
      status: 'success',
      amount: 75.0,
      customTitle: 'Balance Paid!',
      customDescription: 'Your remaining balance has been paid in full. Your booking is all set!',
      message: 'This completes your payment for this booking.',
      details: [
        { label: 'Deposit Paid', value: '$50.00' },
        { label: 'Balance Paid', value: '$75.00', highlight: true },
        { label: 'Total Amount', value: '$125.00', highlight: true },
        { label: 'Service', value: 'Event Photography' },
        { label: 'Status', value: 'Fully Paid', highlight: true },
      ],
    },
  ];

  if (selectedScenario) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedScenario(null)} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedScenario.label}</Text>
        </View>

        <PaymentConfirmation
          status={selectedScenario.status}
          amount={selectedScenario.amount}
          transactionId={`TXN-${Date.now().toString().slice(-8)}`}
          customTitle={selectedScenario.customTitle}
          customDescription={selectedScenario.customDescription}
          message={selectedScenario.message}
          details={selectedScenario.details}
          showReceipt={selectedScenario.status === 'success'}
          showContactProvider={selectedScenario.id === 'booking-success'}
          onClose={() => setSelectedScenario(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Confirmations Demo</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Confirmation Screens</Text>
          <Text style={styles.introText}>
            Explore different payment confirmation scenarios. Tap any card to see the full
            confirmation screen.
          </Text>
        </View>

        <View style={styles.scenariosContainer}>
          {scenarios.map((scenario) => (
            <TouchableOpacity
              key={scenario.id}
              style={[
                styles.scenarioCard,
                scenario.status === 'success' && styles.successCard,
                scenario.status === 'failed' && styles.errorCard,
                scenario.status === 'pending' && styles.warningCard,
                scenario.status === 'refunded' && styles.infoCard,
                scenario.status === 'partial' && styles.warningCard,
              ]}
              onPress={() => setSelectedScenario(scenario)}
              activeOpacity={0.7}
            >
              <View style={styles.scenarioHeader}>
                <View
                  style={[
                    styles.statusIndicator,
                    scenario.status === 'success' && styles.successIndicator,
                    scenario.status === 'failed' && styles.errorIndicator,
                    scenario.status === 'pending' && styles.warningIndicator,
                    scenario.status === 'refunded' && styles.infoIndicator,
                    scenario.status === 'partial' && styles.warningIndicator,
                  ]}
                />
                <Text style={styles.scenarioLabel}>{scenario.label}</Text>
              </View>
              <View style={styles.scenarioDetails}>
                <Text style={styles.scenarioAmount}>${scenario.amount.toFixed(2)}</Text>
                <Text style={styles.scenarioStatus}>
                  {scenario.status.charAt(0).toUpperCase() + scenario.status.slice(1)}
                </Text>
              </View>
              {scenario.message && (
                <Text style={styles.scenarioMessage} numberOfLines={2}>
                  {scenario.message}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>About These Screens</Text>
          <Text style={styles.infoBoxText}>
            These confirmation screens provide clear feedback to users about their payment status.
            Each screen includes:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Visual status indicators</Text>
            <Text style={styles.featureItem}>• Complete transaction details</Text>
            <Text style={styles.featureItem}>• Contextual actions (download receipt, contact, etc.)</Text>
            <Text style={styles.featureItem}>• Security and trust messaging</Text>
            <Text style={styles.featureItem}>• Support access</Text>
          </View>
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
  intro: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  introTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  introText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  scenariosContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  scenarioCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  successCard: {
    borderColor: colors.success + '50',
    backgroundColor: colors.success + '05',
  },
  errorCard: {
    borderColor: colors.error + '50',
    backgroundColor: colors.error + '05',
  },
  warningCard: {
    borderColor: colors.warning + '50',
    backgroundColor: colors.warning + '05',
  },
  infoCard: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '05',
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  successIndicator: {
    backgroundColor: colors.success,
  },
  errorIndicator: {
    backgroundColor: colors.error,
  },
  warningIndicator: {
    backgroundColor: colors.warning,
  },
  infoIndicator: {
    backgroundColor: colors.primary,
  },
  scenarioLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  scenarioDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scenarioAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  scenarioStatus: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  scenarioMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoBox: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoBoxTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoBoxText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  featureList: {
    marginTop: spacing.sm,
  },
  featureItem: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 24,
  },
});
