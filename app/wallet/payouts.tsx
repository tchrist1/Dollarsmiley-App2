import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import PayoutRequestForm from '@/components/PayoutRequestForm';
import PayoutRequestsList from '@/components/PayoutRequestsList';
import {
  getWallet,
  getPayoutRequests,
  getPayoutRequestSummary,
  formatCurrency,
  type Wallet,
  type PayoutRequest,
} from '@/lib/payout-requests';

export default function PayoutsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    const walletData = await getWallet(user.id);
    if (walletData) {
      setWallet(walletData);

      const requestsData = await getPayoutRequests(walletData.id);
      setRequests(requestsData);
    }

    setLoading(false);
  };

  const handleSuccess = () => {
    setShowForm(false);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Payouts',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payout information...</Text>
        </View>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Payouts',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>Wallet Not Found</Text>
          <Text style={styles.emptyText}>
            Your wallet needs to be created before you can request payouts.
          </Text>
        </View>
      </View>
    );
  }

  const summary = getPayoutRequestSummary(requests);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Payouts',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowForm(true)}>
              <Plus size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Available</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(wallet.available_balance, wallet.currency)}
              </Text>
            </View>

            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Pending</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(wallet.pending_balance, wallet.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.processing}</Text>
            <Text style={styles.statLabel}>Processing</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, summary.failed > 0 && styles.statValueError]}>
              {summary.failed}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        {/* Request Button */}
        {wallet.available_balance >= 10 && (
          <TouchableOpacity style={styles.requestButton} onPress={() => setShowForm(true)}>
            <Plus size={20} color={colors.white} />
            <Text style={styles.requestButtonText}>Request Payout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Requests List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Payout History</Text>
        <PayoutRequestsList
          requests={requests}
          wallet={wallet}
          onRefresh={loadData}
          loading={false}
        />
      </View>

      {/* Request Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Payout</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <PayoutRequestForm
            wallet={wallet}
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
  header: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.white + 'CC',
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  statValueError: {
    color: colors.error,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
  },
  requestButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
