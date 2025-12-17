import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Shield, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import EscrowService from '@/lib/escrow';

interface EscrowStatusProps {
  bookingId: string;
  userRole: 'customer' | 'provider';
  compact?: boolean;
}

export function EscrowStatus({ bookingId, userRole, compact = false }: EscrowStatusProps) {
  const [loading, setLoading] = useState(true);
  const [escrowStatus, setEscrowStatus] = useState<any>(null);

  useEffect(() => {
    fetchEscrowStatus();
  }, [bookingId]);

  const fetchEscrowStatus = async () => {
    setLoading(true);
    const status = await EscrowService.getEscrowStatus(bookingId);
    setEscrowStatus(status);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!escrowStatus || !escrowStatus.hasEscrow) {
    return null;
  }

  const getStatusConfig = () => {
    switch (escrowStatus.status) {
      case 'Held':
        return {
          icon: <Shield size={compact ? 16 : 20} color={colors.warning} />,
          title: 'Funds in Escrow',
          description:
            userRole === 'customer'
              ? 'Your payment is held securely until service completion'
              : `Funds will be released after service completion (${escrowStatus.daysUntilExpiry} days)`,
          color: colors.warning,
          bgColor: colors.warning + '10',
          borderColor: colors.warning + '30',
        };
      case 'Released':
        return {
          icon: <CheckCircle size={compact ? 16 : 20} color={colors.success} />,
          title: 'Funds Released',
          description:
            userRole === 'customer'
              ? 'Payment has been released to the provider'
              : 'Funds have been transferred to your wallet',
          color: colors.success,
          bgColor: colors.success + '10',
          borderColor: colors.success + '30',
        };
      case 'Refunded':
        return {
          icon: <XCircle size={compact ? 16 : 20} color={colors.error} />,
          title: 'Refunded',
          description:
            userRole === 'customer'
              ? 'Your payment has been refunded'
              : 'Payment was refunded to customer',
          color: colors.error,
          bgColor: colors.error + '10',
          borderColor: colors.error + '30',
        };
      case 'Disputed':
        return {
          icon: <AlertTriangle size={compact ? 16 : 20} color={colors.error} />,
          title: 'Under Dispute',
          description: 'Funds are frozen pending dispute resolution',
          color: colors.error,
          bgColor: colors.error + '10',
          borderColor: colors.error + '30',
        };
      case 'Expired':
        return {
          icon: <Clock size={compact ? 16 : 20} color={colors.textSecondary} />,
          title: 'Expired',
          description: 'Escrow period has expired',
          color: colors.textSecondary,
          bgColor: colors.surface,
          borderColor: colors.border,
        };
      default:
        return {
          icon: <Shield size={compact ? 16 : 20} color={colors.primary} />,
          title: 'Protected Payment',
          description: 'Payment is protected',
          color: colors.primary,
          bgColor: colors.primary + '10',
          borderColor: colors.primary + '30',
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <View
        style={[
          styles.containerCompact,
          { backgroundColor: config.bgColor, borderColor: config.borderColor },
        ]}
      >
        {config.icon}
        <Text style={[styles.titleCompact, { color: config.color }]}>{config.title}</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}
    >
      <View style={styles.header}>
        {config.icon}
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
          {escrowStatus.amount && (
            <Text style={styles.amount}>${escrowStatus.amount.toFixed(2)}</Text>
          )}
        </View>
      </View>

      <Text style={styles.description}>{config.description}</Text>

      {escrowStatus.status === 'Held' && escrowStatus.daysUntilExpiry !== undefined && (
        <View style={styles.timelineContainer}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.timelineText}>
            Auto-release in {escrowStatus.daysUntilExpiry} days
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  titleCompact: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timelineText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
