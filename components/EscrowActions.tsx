import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, ScrollView } from 'react-native';
import { Button } from './Button';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  FileText,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import EscrowService from '@/lib/escrow';

interface EscrowActionsProps {
  bookingId: string;
  escrowHoldId: string;
  escrowStatus: string;
  amount: number;
  userRole: 'customer' | 'provider' | 'admin';
  customerId: string;
  providerId: string;
  onActionComplete?: () => void;
}

export function EscrowActions({
  bookingId,
  escrowHoldId,
  escrowStatus,
  amount,
  userRole,
  customerId,
  providerId,
  onActionComplete,
}: EscrowActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(amount.toString());

  const handleReleaseEscrow = async () => {
    Alert.alert(
      'Release Funds',
      'Are you sure you want to release the escrow funds to the provider? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const success = await EscrowService.releaseEscrow(escrowHoldId, bookingId);
            setLoading(false);

            if (success) {
              Alert.alert('Success', 'Escrow funds have been released to the provider');
              onActionComplete?.();
            } else {
              Alert.alert('Error', 'Failed to release escrow funds. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRequestRefund = async () => {
    if (!refundReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the refund');
      return;
    }

    const refundAmountNum = parseFloat(refundAmount);
    if (isNaN(refundAmountNum) || refundAmountNum <= 0 || refundAmountNum > amount) {
      Alert.alert('Error', 'Please enter a valid refund amount');
      return;
    }

    setLoading(true);
    const result = await EscrowService.requestRefund({
      bookingId,
      escrowHoldId,
      amount: refundAmountNum,
      reason: refundReason,
      requestedBy: customerId,
      notes: `Refund requested by ${userRole}`,
    });
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Refund Requested',
        'Your refund request has been submitted and is pending admin approval.'
      );
      setShowRefundForm(false);
      setRefundReason('');
      onActionComplete?.();
    } else {
      Alert.alert('Error', result.error || 'Failed to request refund');
    }
  };

  if (escrowStatus !== 'Held') {
    return null;
  }

  if (showRefundForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <XCircle size={24} color={colors.error} />
          <Text style={styles.title}>Request Refund</Text>
        </View>

        <Text style={styles.label}>Refund Amount</Text>
        <View style={styles.amountInput}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.input}
            value={refundAmount}
            onChangeText={setRefundAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
          />
        </View>
        <Text style={styles.helperText}>Maximum: ${amount.toFixed(2)}</Text>

        <Text style={styles.label}>Reason for Refund</Text>
        <TextInput
          style={styles.textArea}
          value={refundReason}
          onChangeText={setRefundReason}
          placeholder="Please explain why you're requesting a refund..."
          placeholderTextColor={colors.textLight}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.actions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setShowRefundForm(false)}
            style={styles.actionButton}
          />
          <Button
            title="Submit Request"
            onPress={handleRequestRefund}
            loading={loading}
            style={styles.actionButton}
          />
        </View>

        <View style={styles.infoBox}>
          <AlertTriangle size={16} color={colors.warning} />
          <Text style={styles.infoText}>
            Refund requests over $100 require admin approval. You'll be notified once your request
            is reviewed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <DollarSign size={24} color={colors.primary} />
        <Text style={styles.title}>Escrow Actions</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Amount in Escrow</Text>
        <Text style={styles.statusAmount}>${amount.toFixed(2)}</Text>
        <Text style={styles.statusDescription}>
          Funds are held securely and will be released according to the booking terms
        </Text>
      </View>

      <View style={styles.actions}>
        {userRole === 'customer' && (
          <Button
            title="Request Refund"
            variant="outline"
            onPress={() => setShowRefundForm(true)}
            style={styles.actionButton}
            icon={<XCircle size={20} color={colors.error} />}
          />
        )}

        {(userRole === 'admin' || userRole === 'provider') && (
          <Button
            title="Release Funds"
            onPress={handleReleaseEscrow}
            loading={loading}
            style={styles.actionButton}
            icon={<CheckCircle size={20} color={colors.white} />}
          />
        )}
      </View>

      {userRole === 'customer' && (
        <View style={styles.protectionBox}>
          <FileText size={16} color={colors.success} />
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Buyer Protection</Text>
            <Text style={styles.protectionText}>
              Your payment is protected. If the service is not provided as agreed, you can request
              a full refund.
            </Text>
          </View>
        </View>
      )}

      {userRole === 'provider' && (
        <View style={styles.protectionBox}>
          <FileText size={16} color={colors.primary} />
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Payment Guarantee</Text>
            <Text style={styles.protectionText}>
              Complete the service as agreed and funds will be automatically released to your
              wallet within 30 days.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  statusDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
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
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  currencySymbol: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginLeft: spacing.sm,
  },
  protectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '05',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  protectionContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  protectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  protectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
