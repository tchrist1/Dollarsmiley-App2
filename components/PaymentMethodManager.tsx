import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {
  CreditCard,
  CheckCircle,
  Trash2,
  AlertCircle,
  Plus,
} from 'lucide-react-native';
import {
  deletePaymentMethod,
  setDefaultPaymentMethod,
  formatPaymentMethodForDisplay,
  type PaymentMethod,
} from '@/lib/payment-methods';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface PaymentMethodManagerProps {
  paymentMethods: PaymentMethod[];
  onMethodsUpdated: () => void;
  onAddMethod: () => void;
}

export default function PaymentMethodManager({
  paymentMethods,
  onMethodsUpdated,
  onAddMethod,
}: PaymentMethodManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSetDefault = async (methodId: string) => {
    setLoading(methodId);
    try {
      const success = await setDefaultPaymentMethod(methodId);
      if (success) {
        onMethodsUpdated();
      } else {
        Alert.alert('Error', 'Failed to set default payment method');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = (method: PaymentMethod) => {
    if (method.is_default) {
      Alert.alert(
        'Cannot Delete',
        'Cannot delete your default payment method. Please set another payment method as default first.'
      );
      return;
    }

    const methodDisplay = formatPaymentMethodForDisplay(method);

    Alert.alert(
      'Delete Payment Method',
      `Are you sure you want to delete ${methodDisplay.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(method.id);
            try {
              const success = await deletePaymentMethod(method.id);
              if (success) {
                onMethodsUpdated();
              } else {
                Alert.alert('Error', 'Failed to delete payment method');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setLoading(null);
            }
          },
        },
      ]
    );
  };

  if (paymentMethods.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <CreditCard size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No payment methods added</Text>
        <Text style={styles.emptySubtext}>
          Add a payment method to make payments easier
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddMethod}>
          <Plus size={20} color={colors.white} />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Methods</Text>
        <TouchableOpacity style={styles.addIconButton} onPress={onAddMethod}>
          <Plus size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.methodsList}>
        {paymentMethods.map((method) => {
          const display = formatPaymentMethodForDisplay(method);
          const isProcessing = loading === method.id;

          return (
            <View
              key={method.id}
              style={[
                styles.methodCard,
                display.isDefault && styles.methodCardDefault,
                display.isExpired && styles.methodCardExpired,
              ]}
            >
              <View style={styles.methodHeader}>
                <View style={styles.methodIcon}>
                  <Text style={styles.methodIconText}>{display.icon}</Text>
                </View>

                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>{display.title}</Text>
                  {display.subtitle && (
                    <Text style={styles.methodSubtitle}>{display.subtitle}</Text>
                  )}
                  {display.isExpired && (
                    <View style={styles.expiredBadge}>
                      <AlertCircle size={12} color={colors.error} />
                      <Text style={styles.expiredText}>Expired</Text>
                    </View>
                  )}
                  {display.isExpiringSoon && !display.isExpired && (
                    <View style={styles.expiringBadge}>
                      <AlertCircle size={12} color={colors.warning} />
                      <Text style={styles.expiringText}>Expiring soon</Text>
                    </View>
                  )}
                </View>

                {display.isDefault && (
                  <View style={styles.defaultBadge}>
                    <CheckCircle size={16} color={colors.success} />
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>

              <View style={styles.methodActions}>
                {!display.isDefault && !isProcessing && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetDefault(method.id)}
                  >
                    <Text style={styles.actionButtonText}>Set as Default</Text>
                  </TouchableOpacity>
                )}

                {!display.isDefault && !isProcessing && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(method)}
                  >
                    <Trash2 size={16} color={colors.error} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}

                {isProcessing && (
                  <Text style={styles.processingText}>Processing...</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.infoCard}>
          <AlertCircle size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Your payment information is securely stored and encrypted. We never
            store your full card number or CVV.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  addIconButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
  },
  methodsList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  methodCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.md,
  },
  methodCardDefault: {
    borderColor: colors.success,
    backgroundColor: colors.success + '05',
  },
  methodCardExpired: {
    borderColor: colors.error,
    backgroundColor: colors.error + '05',
    opacity: 0.8,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconText: {
    fontSize: 24,
  },
  methodInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  methodTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  methodSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  defaultText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expiredText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.semibold,
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expiringText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },
  methodActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  deleteButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.error + '15',
    flex: 0,
    paddingHorizontal: spacing.lg,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  processingText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
});
