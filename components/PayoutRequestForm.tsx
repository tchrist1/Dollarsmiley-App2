import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { DollarSign, AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  createPayoutRequest,
  validatePayoutRequest,
  formatCurrency,
  formatPayoutMethod,
  getEstimatedArrival,
  getPayoutFee,
  getPayoutTotal,
  type Wallet,
} from '@/lib/payout-requests';

interface PayoutRequestFormProps {
  wallet: Wallet;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function PayoutRequestForm({
  wallet,
  onSuccess,
  onCancel,
}: PayoutRequestFormProps) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const numericAmount = parseFloat(amount) || 0;
  const fee = getPayoutFee(numericAmount, wallet.payout_method || '');
  const total = getPayoutTotal(numericAmount, wallet.payout_method || '');

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;

    setAmount(cleaned);
    setErrors([]);
  };

  const setMaxAmount = () => {
    setAmount((wallet.balance ?? 0).toFixed(2));
    setErrors([]);
  };

  const handleSubmit = async () => {
    const validation = await validatePayoutRequest(wallet, numericAmount);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    Alert.alert(
      'Confirm Payout',
      `Request payout of ${formatCurrency(numericAmount, wallet.currency)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);

            const result = await createPayoutRequest(wallet.id, {
              amount: numericAmount,
              payout_method: wallet.payout_method || 'BankTransfer',
              payout_details: {
                account_email: wallet.payout_email || undefined,
              },
            });

            setSubmitting(false);

            if (result.success) {
              Alert.alert('Success', 'Payout request submitted successfully');
              setAmount('');
              onSuccess();
            } else {
              Alert.alert('Error', result.error || 'Failed to submit payout request');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(wallet.balance ?? 0, wallet.currency)}
        </Text>
        {wallet.pending_balance > 0 && (
          <Text style={styles.pendingText}>
            {formatCurrency(wallet.pending_balance, wallet.currency)} pending
          </Text>
        )}
      </View>

      {/* Amount Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Payout Amount</Text>
        <View style={styles.inputContainer}>
          <DollarSign size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            editable={!submitting}
          />
          <TouchableOpacity style={styles.maxButton} onPress={setMaxAmount}>
            <Text style={styles.maxButtonText}>MAX</Text>
          </TouchableOpacity>
        </View>

        {numericAmount > 0 && (
          <View style={styles.quickAmounts}>
            {[25, 50, 100, 250, 500].map((quickAmount) => {
              if (quickAmount > (wallet.balance ?? 0)) return null;
              return (
                <TouchableOpacity
                  key={quickAmount}
                  style={styles.quickAmountButton}
                  onPress={() => setAmount(quickAmount.toString())}
                >
                  <Text style={styles.quickAmountText}>${quickAmount}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Errors */}
      {errors.length > 0 && (
        <View style={styles.errorsContainer}>
          {errors.map((error, index) => (
            <View key={index} style={styles.errorRow}>
              <AlertCircle size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Payout Details */}
      {numericAmount > 0 && errors.length === 0 && (
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Payout Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Method</Text>
            <Text style={styles.detailValue}>
              {formatPayoutMethod(wallet.payout_method || 'BankTransfer')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {wallet.payout_email || 'Not configured'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(numericAmount, wallet.currency)}
            </Text>
          </View>

          {fee > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fee</Text>
              <Text style={[styles.detailValue, styles.feeValue]}>
                -{formatCurrency(fee, wallet.currency)}
              </Text>
            </View>
          )}

          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>You'll Receive</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(total, wallet.currency)}
            </Text>
          </View>

          <View style={styles.estimateContainer}>
            <Info size={14} color={colors.primary} />
            <Text style={styles.estimateText}>
              Estimated arrival: {getEstimatedArrival(wallet.payout_method || 'BankTransfer')}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.submitButton, (submitting || errors.length > 0 || numericAmount <= 0) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || errors.length > 0 || numericAmount <= 0}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <CheckCircle size={20} color={colors.white} />
              <Text style={styles.submitButtonText}>Request Payout</Text>
            </>
          )}
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={submitting}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Payout Information</Text>
        <Text style={styles.infoText}>
          • Payouts are processed within 1-3 business days{'\n'}
          • Minimum payout amount is $10{'\n'}
          • You'll receive an email confirmation{'\n'}
          • Funds will be sent to your configured payout method
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.white + 'CC',
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  pendingText: {
    fontSize: fontSize.sm,
    color: colors.white + 'CC',
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  maxButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
  },
  maxButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickAmountButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAmountText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  errorsContainer: {
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    flex: 1,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  detailsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  feeValue: {
    color: colors.error,
  },
  totalRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  estimateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
  },
  estimateText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    flex: 1,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
