import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { XCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  cancelPayoutRequest,
  formatCurrency,
  formatPayoutMethod,
  getPayoutStatusColor,
  getPayoutStatusIcon,
  formatRelativeTime,
  canCancelPayout,
  type PayoutRequest,
  type Wallet,
} from '@/lib/payout-requests';

interface PayoutRequestsListProps {
  requests: PayoutRequest[];
  wallet: Wallet;
  onRefresh: () => void;
  loading?: boolean;
}

export default function PayoutRequestsList({
  requests,
  wallet,
  onRefresh,
  loading = false,
}: PayoutRequestsListProps) {
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (request: PayoutRequest) => {
    Alert.alert(
      'Cancel Payout',
      `Are you sure you want to cancel this payout of ${formatCurrency(request.amount, wallet.currency)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(request.id);
            const success = await cancelPayoutRequest(request.id);

            if (success) {
              Alert.alert('Success', 'Payout request cancelled');
              onRefresh();
            } else {
              Alert.alert('Error', 'Failed to cancel payout request');
            }
            setCancelling(null);
          },
        },
      ]
    );
  };

  const renderRequest = ({ item }: { item: PayoutRequest }) => {
    const statusColor = getPayoutStatusColor(item.status);
    const statusIcon = getPayoutStatusIcon(item.status);
    const isCancelling = cancelling === item.id;

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestLeft}>
            <Text style={styles.statusIcon}>{statusIcon}</Text>
            <View style={styles.requestInfo}>
              <Text style={styles.requestAmount}>
                {formatCurrency(item.amount, wallet.currency)}
              </Text>
              <Text style={styles.requestMethod}>
                {formatPayoutMethod(item.payout_method)}
              </Text>
            </View>
          </View>

          <View style={styles.requestRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              Requested {formatRelativeTime(item.requested_at)}
            </Text>
          </View>

          {item.processed_at && (
            <View style={styles.detailRow}>
              <CheckCircle size={14} color={colors.success} />
              <Text style={styles.detailText}>
                Processed {formatRelativeTime(item.processed_at)}
              </Text>
            </View>
          )}

          {item.payout_details?.account_email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To:</Text>
              <Text style={styles.detailText} numberOfLines={1}>
                {item.payout_details.account_email}
              </Text>
            </View>
          )}

          {item.failure_reason && (
            <View style={styles.failureContainer}>
              <AlertTriangle size={14} color={colors.error} />
              <Text style={styles.failureText}>{item.failure_reason}</Text>
            </View>
          )}
        </View>

        {canCancelPayout(item) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancel(item)}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <XCircle size={16} color={colors.error} />
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💸</Text>
      <Text style={styles.emptyTitle}>No Payout Requests</Text>
      <Text style={styles.emptyText}>
        You haven't requested any payouts yet. Request a payout to transfer funds to your account.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading payout requests...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderRequest}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  statusIcon: {
    fontSize: fontSize.xxxl,
  },
  requestInfo: {
    flex: 1,
  },
  requestAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  requestMethod: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  requestRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  requestDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  failureContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.sm,
  },
  failureText: {
    fontSize: fontSize.sm,
    color: colors.error,
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
