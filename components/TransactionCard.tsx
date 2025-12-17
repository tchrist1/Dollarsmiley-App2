import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  getTransactionTypeColor,
  getTransactionStatusColor,
  formatAmount,
  getRelativeTime,
  type Transaction,
} from '@/lib/transactions';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
  showBooking?: boolean;
}

export function TransactionCard({
  transaction,
  onPress,
  showBooking = true,
}: TransactionCardProps) {
  const isPositive = ['Earning', 'Refund'].includes(transaction.transaction_type);
  const typeColor = getTransactionTypeColor(transaction.transaction_type);
  const statusColor = getTransactionStatusColor(transaction.status);

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'Completed':
        return <CheckCircle size={16} color={colors.success} />;
      case 'Pending':
        return <Clock size={16} color={colors.warning} />;
      case 'Failed':
        return <XCircle size={16} color={colors.error} />;
      case 'Cancelled':
        return <AlertCircle size={16} color={colors.textSecondary} />;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: typeColor + '20' }]}>
          {isPositive ? (
            <TrendingUp size={20} color={typeColor} />
          ) : (
            <TrendingDown size={20} color={typeColor} />
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>

          {showBooking && transaction.booking && (
            <Text style={styles.bookingTitle} numberOfLines={1}>
              {transaction.booking.title}
            </Text>
          )}

          <View style={styles.meta}>
            <Text style={styles.time}>{getRelativeTime(transaction.created_at)}</Text>
            <View style={styles.statusBadge}>
              {getStatusIcon()}
              <Text style={[styles.statusText, { color: statusColor }]}>
                {transaction.status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.amount, { color: isPositive ? colors.success : colors.error }]}>
          {isPositive ? '+' : '-'}
          {formatAmount(Math.abs(transaction.amount))}
        </Text>

        {onPress && <ChevronRight size={20} color={colors.textSecondary} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  description: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  bookingTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
