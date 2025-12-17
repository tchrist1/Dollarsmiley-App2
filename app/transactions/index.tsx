import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { TransactionCard } from '@/components/TransactionCard';
import { TransactionFilters } from '@/components/TransactionFilters';
import { TransactionSearchBar } from '@/components/TransactionSearchBar';
import { ExportMenu } from '@/components/ExportMenu';
import { useAuth } from '@/contexts/AuthContext';
import {
  getWalletByUserId,
  getTransactions,
  getTransactionStats,
  groupTransactionsByDate,
  type Transaction,
  type TransactionFilters as TFilters,
  type TransactionStats,
} from '@/lib/transactions';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [walletId, setWalletId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [filters, setFilters] = useState<TFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  useEffect(() => {
    if (walletId) {
      loadTransactions();
      loadStats();
    }
  }, [walletId, filters]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        setFilters({ ...filters, search: searchQuery });
      } else {
        const { search, ...rest } = filters;
        setFilters(rest);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const loadWallet = async () => {
    if (!user) return;

    const wallet = await getWalletByUserId(user.id);
    if (wallet) {
      setWalletId(wallet.id);
    }
  };

  const loadTransactions = async () => {
    if (!walletId) return;

    try {
      setLoading(true);
      const data = await getTransactions(walletId, filters, 100);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!walletId) return;

    try {
      const data = await getTransactionStats(
        walletId,
        filters.startDate,
        filters.endDate
      );
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    await loadTransactions();
    await loadStats();
    setRefreshing(false);
  };


  const handleTransactionPress = (transaction: Transaction) => {
    router.push(`/transactions/${transaction.id}`);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    const { search, ...rest } = filters;
    setFilters(rest);
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.type) count++;
    if (filters.status) count++;
    if (filters.startDate) count++;
    return count;
  };

  const groupedTransactions = groupTransactionsByDate(transactions);
  const dates = Object.keys(groupedTransactions);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to view transactions</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Transaction History',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardGreen]}>
                <View style={styles.statHeader}>
                  <TrendingUp size={20} color={colors.success} />
                  <Text style={styles.statLabel}>Earnings</Text>
                </View>
                <Text style={styles.statValue}>
                  ${stats.totalEarnings.toFixed(2)}
                </Text>
              </View>

              <View style={[styles.statCard, styles.statCardBlue]}>
                <View style={styles.statHeader}>
                  <TrendingDown size={20} color={colors.primary} />
                  <Text style={styles.statLabel}>Payouts</Text>
                </View>
                <Text style={styles.statValue}>
                  ${stats.totalPayouts.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardOrange]}>
                <View style={styles.statHeader}>
                  <DollarSign size={20} color={colors.warning} />
                  <Text style={styles.statLabel}>Refunds</Text>
                </View>
                <Text style={styles.statValue}>
                  ${stats.totalRefunds.toFixed(2)}
                </Text>
              </View>

              <View style={[styles.statCard, styles.statCardRed]}>
                <View style={styles.statHeader}>
                  <AlertCircle size={20} color={colors.error} />
                  <Text style={styles.statLabel}>Fees</Text>
                </View>
                <Text style={styles.statValue}>
                  ${stats.totalFees.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Transactions</Text>
              <Text style={styles.summaryValue}>
                {stats.completedTransactions}
              </Text>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TransactionSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={handleSearchClear}
            showHistory={true}
          />
        </View>

        {/* Search Results Info */}
        {searchQuery.trim() && (
          <View style={styles.searchInfo}>
            <Text style={styles.searchInfoText}>
              {transactions.length === 0
                ? 'No transactions found'
                : `${transactions.length} result${transactions.length !== 1 ? 's' : ''} for "${searchQuery}"`}
            </Text>
            {transactions.length === 0 && (
              <TouchableOpacity onPress={handleSearchClear}>
                <Text style={styles.clearSearchText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Filters and Export */}
        <View style={styles.actionsBar}>
          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={getActiveFilterCount()}
          />

          {walletId && (
            <ExportMenu
              walletId={walletId}
              transactionCount={transactions.length}
              filters={filters}
              onExportComplete={() => {}}
            />
          )}
        </View>

        {/* Transactions List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <DollarSign size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Transactions</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery.trim()
                ? 'No transactions match your search'
                : getActiveFilterCount() > 0
                ? 'No transactions match your filters'
                : 'Your transaction history will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {dates.map((date) => (
              <View key={date} style={styles.dateSection}>
                <Text style={styles.dateHeader}>{date}</Text>
                {groupedTransactions[date].map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onPress={() => handleTransactionPress(transaction)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  statCardGreen: {
    backgroundColor: colors.success + '20',
  },
  statCardBlue: {
    backgroundColor: colors.primary + '20',
  },
  statCardOrange: {
    backgroundColor: colors.warning + '20',
  },
  statCardRed: {
    backgroundColor: colors.error + '20',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInfoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  clearSearchText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  transactionsList: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  dateSection: {
    gap: spacing.sm,
  },
  dateHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
