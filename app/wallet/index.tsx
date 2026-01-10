import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigation-utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import {
  ArrowLeft,
  Wallet as WalletIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface WalletData {
  id: string;
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid_out: number;
  payout_email?: string;
  payout_method?: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  completed_at?: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  requested_at: string;
  processed_at?: string;
  failure_reason?: string;
}

type TabType = 'overview' | 'transactions' | 'payouts' | 'tax';
type TransactionFilter = 'all' | 'earnings' | 'payouts' | 'fees' | 'refunds';
type TimeFilter = 'all' | '7days' | '30days' | '90days' | 'year';

export default function WalletScreen() {
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30days');
  const [analytics, setAnalytics] = useState({
    thisMonth: 0,
    lastMonth: 0,
    averageTransaction: 0,
    successRate: 0,
  });

  useEffect(() => {
    if (profile) {
      fetchWalletData();
    }
  }, [profile]);

  useEffect(() => {
    if (transactions.length > 0) {
      calculateAnalytics();
    }
  }, [transactions]);

  const fetchWalletData = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (walletError) {
        console.error('Wallet fetch error:', walletError);
      }

      let currentWallet = walletData;

      if (!currentWallet) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: profile.id })
          .select()
          .single();

        if (createError) {
          console.error('Wallet creation error:', createError);
          Alert.alert('Error', 'Failed to create wallet');
          setLoading(false);
          return;
        }
        currentWallet = newWallet;
      }

      setWallet(currentWallet);

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', currentWallet.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsData) {
        setTransactions(transactionsData);
      }

      const { data: payoutsData } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('wallet_id', currentWallet.id)
        .order('requested_at', { ascending: false })
        .limit(20);

      if (payoutsData) {
        setPayoutRequests(payoutsData);
      }
    } catch (error) {
      console.error('Wallet data fetch error:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const thisMonthTransactions = transactions.filter(
      (tx) => new Date(tx.created_at) >= thirtyDaysAgo && tx.transaction_type === 'Earning'
    );
    const lastMonthTransactions = transactions.filter(
      (tx) =>
        new Date(tx.created_at) >= sixtyDaysAgo &&
        new Date(tx.created_at) < thirtyDaysAgo &&
        tx.transaction_type === 'Earning'
    );

    const thisMonthTotal = thisMonthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const lastMonthTotal = lastMonthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const avgTransaction =
      thisMonthTransactions.length > 0 ? thisMonthTotal / thisMonthTransactions.length : 0;

    const completed = transactions.filter((tx) => tx.status === 'Completed').length;
    const successRate = transactions.length > 0 ? (completed / transactions.length) * 100 : 0;

    setAnalytics({
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      averageTransaction: avgTransaction,
      successRate,
    });
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Apply transaction type filter
    if (transactionFilter !== 'all') {
      const typeMap: Record<string, string[]> = {
        earnings: ['Earning'],
        payouts: ['Payout'],
        fees: ['Fee'],
        refunds: ['Refund'],
      };
      filtered = filtered.filter((tx) => typeMap[transactionFilter]?.includes(tx.transaction_type));
    }

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const daysMap = { '7days': 7, '30days': 30, '90days': 90, year: 365 };
      const days = daysMap[timeFilter as keyof typeof daysMap] || 30;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((tx) => new Date(tx.created_at) >= cutoffDate);
    }

    return filtered;
  };

  const exportTransactions = () => {
    const filtered = getFilteredTransactions();
    const csv = [
      ['Date', 'Type', 'Description', 'Amount', 'Status'].join(','),
      ...filtered.map((tx) =>
        [
          new Date(tx.created_at).toLocaleDateString(),
          tx.transaction_type,
          tx.description,
          (tx.amount ?? 0).toFixed(2),
          tx.status,
        ].join(',')
      ),
    ].join('\n');

    Alert.alert('Export Ready', 'Transaction data prepared for export', [
      { text: 'OK' },
    ]);
  };

  const handleRequestPayout = async () => {
    if (!wallet || !payoutAmount) return;

    const amount = parseFloat(payoutAmount);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (amount > (wallet.balance ?? 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance for this payout');
      return;
    }

    if (amount < 10) {
      Alert.alert('Minimum Payout', 'Minimum payout amount is $10');
      return;
    }

    setRequestingPayout(true);

    const { error } = await supabase.from('payout_requests').insert({
      wallet_id: wallet.id,
      amount,
      payout_method: wallet.payout_method || 'BankTransfer',
      payout_details: JSON.stringify({
        email: wallet.payout_email,
      }),
    });

    if (error) {
      Alert.alert('Error', 'Failed to request payout. Please try again.');
    } else {
      Alert.alert(
        'Payout Requested',
        `Your payout request for $${(amount ?? 0).toFixed(2)} has been submitted and will be processed within 1-3 business days.`,
        [{ text: 'OK', onPress: () => setPayoutAmount('') }]
      );
      fetchWalletData();
    }

    setRequestingPayout(false);
  };

  const handleGenerateTaxDocument = async () => {
    if (!profile) return;

    const currentYear = new Date().getFullYear();
    const { data: yearTransactions } = await supabase
      .from('transactions')
      .select('amount, transaction_type')
      .eq('wallet_id', wallet?.id)
      .eq('status', 'Completed')
      .gte('created_at', `${currentYear}-01-01`)
      .lte('created_at', `${currentYear}-12-31`);

    let totalEarnings = 0;
    let totalFees = 0;

    yearTransactions?.forEach((tx) => {
      if (tx.transaction_type === 'Earning') {
        totalEarnings += parseFloat(tx.amount);
      } else if (tx.transaction_type === 'Fee') {
        totalFees += parseFloat(tx.amount);
      }
    });

    await supabase.from('tax_documents').insert({
      user_id: profile.id,
      tax_year: currentYear,
      document_type: 'Summary',
      total_earnings: totalEarnings,
      total_fees: totalFees,
    });

    Alert.alert(
      'Tax Document Generated',
      `Your ${currentYear} tax summary has been generated.\n\nTotal Earnings: $${(totalEarnings ?? 0).toFixed(2)}\nTotal Fees: $${(totalFees ?? 0).toFixed(2)}\n\nNet Income: $${((totalEarnings ?? 0) - (totalFees ?? 0)).toFixed(2)}`,
      [{ text: 'OK' }]
    );
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Earning':
        return <TrendingUp size={20} color={colors.success} />;
      case 'Payout':
      case 'Fee':
        return <TrendingDown size={20} color={colors.error} />;
      case 'Refund':
        return <ArrowUpRight size={20} color={colors.warning} />;
      default:
        return <DollarSign size={20} color={colors.textSecondary} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle size={16} color={colors.success} />;
      case 'Failed':
      case 'Cancelled':
        return <XCircle size={16} color={colors.error} />;
      default:
        return <Clock size={16} color={colors.warning} />;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionIcon}>{getTransactionIcon(item.transaction_type)}</View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <View style={styles.transactionMeta}>
          {getStatusIcon(item.status)}
          <Text style={styles.transactionStatus}>{item.status}</Text>
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          item.transaction_type === 'Earning' ? styles.positiveAmount : styles.negativeAmount,
        ]}
      >
        {item.transaction_type === 'Earning' ? '+' : '-'}${Math.abs(item.amount ?? 0).toFixed(2)}
      </Text>
    </View>
  );

  const renderPayoutRequest = ({ item }: { item: PayoutRequest }) => (
    <View style={styles.payoutCard}>
      <View style={styles.payoutHeader}>
        <Text style={styles.payoutAmount}>${(item.amount ?? 0).toFixed(2)}</Text>
        <View
          style={[
            styles.payoutStatusBadge,
            {
              backgroundColor:
                item.status === 'Completed'
                  ? colors.success + '20'
                  : item.status === 'Failed'
                  ? colors.error + '20'
                  : colors.warning + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.payoutStatusText,
              {
                color:
                  item.status === 'Completed'
                    ? colors.success
                    : item.status === 'Failed'
                    ? colors.error
                    : colors.warning,
              },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.payoutDetails}>
        <Text style={styles.payoutMethod}>Via {item.payout_method}</Text>
        <Text style={styles.payoutDate}>
          Requested {new Date(item.requested_at).toLocaleDateString()}
        </Text>
      </View>
      {item.failure_reason && (
        <Text style={styles.failureReason}>{item.failure_reason}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Please sign in to view wallet</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={safeGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {wallet && (
          <>
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <WalletIcon size={32} color={colors.white} />
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>
              <Text style={styles.balanceAmount}>${(wallet.balance ?? 0).toFixed(2)}</Text>
              {wallet.pending_balance > 0 && (
                <Text style={styles.pendingBalance}>
                  ${(wallet.pending_balance ?? 0).toFixed(2)} pending
                </Text>
              )}
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <TrendingUp size={24} color={colors.success} />
                <Text style={styles.statValue}>${(wallet.total_earned ?? 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
              <View style={styles.statCard}>
                <TrendingDown size={24} color={colors.primary} />
                <Text style={styles.statValue}>${(wallet.total_paid_out ?? 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Withdrawn</Text>
              </View>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
                onPress={() => setActiveTab('overview')}
              >
                <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                  Overview
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
                onPress={() => setActiveTab('transactions')}
              >
                <Text
                  style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}
                >
                  Transactions
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'payouts' && styles.activeTab]}
                onPress={() => setActiveTab('payouts')}
              >
                <Text style={[styles.tabText, activeTab === 'payouts' && styles.activeTabText]}>
                  Payouts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'tax' && styles.activeTab]}
                onPress={() => setActiveTab('tax')}
              >
                <Text style={[styles.tabText, activeTab === 'tax' && styles.activeTabText]}>
                  Tax
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'overview' && (
              <View style={styles.section}>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsLabel}>This Month</Text>
                    <Text style={styles.analyticsValue}>
                      ${(analytics.thisMonth ?? 0).toFixed(2)}
                    </Text>
                    <View style={styles.analyticsChange}>
                      {analytics.thisMonth >= analytics.lastMonth ? (
                        <TrendingUp size={14} color={colors.success} />
                      ) : (
                        <TrendingDown size={14} color={colors.error} />
                      )}
                      <Text
                        style={[
                          styles.analyticsChangeText,
                          {
                            color:
                              analytics.thisMonth >= analytics.lastMonth
                                ? colors.success
                                : colors.error,
                          },
                        ]}
                      >
                        {analytics.lastMonth > 0
                          ? Math.abs(
                              ((analytics.thisMonth - analytics.lastMonth) / analytics.lastMonth) *
                                100
                            )?.toFixed(1) ?? '0.0'
                          : '0'}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsLabel}>Avg Transaction</Text>
                    <Text style={styles.analyticsValue}>
                      ${(analytics.averageTransaction ?? 0).toFixed(2)}
                    </Text>
                    <Text style={styles.analyticsSubtext}>Per booking</Text>
                  </View>

                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsLabel}>Success Rate</Text>
                    <Text style={styles.analyticsValue}>{(analytics.successRate ?? 0).toFixed(1)}%</Text>
                    <Text style={styles.analyticsSubtext}>Completed</Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                {transactions.slice(0, 5).length > 0 ? (
                  <>
                    {transactions.slice(0, 5).map((tx) => (
                      <View key={tx.id}>{renderTransaction({ item: tx })}</View>
                    ))}
                    <Button
                      title="View All Transactions"
                      onPress={() => setActiveTab('transactions')}
                      variant="outline"
                      style={styles.viewAllButton}
                    />
                  </>
                ) : (
                  <Text style={styles.emptyText}>No transactions yet</Text>
                )}
              </View>
            )}

            {activeTab === 'transactions' && (
              <View style={styles.section}>
                <View style={styles.filterHeader}>
                  <Text style={styles.sectionTitle}>All Transactions</Text>
                  <TouchableOpacity onPress={exportTransactions} style={styles.exportButton}>
                    <Download size={20} color={colors.primary} />
                    <Text style={styles.exportText}>Export</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                  {(['all', 'earnings', 'payouts', 'fees', 'refunds'] as TransactionFilter[]).map(
                    (filter) => (
                      <TouchableOpacity
                        key={filter}
                        style={[
                          styles.filterChip,
                          transactionFilter === filter && styles.filterChipActive,
                        ]}
                        onPress={() => setTransactionFilter(filter)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            transactionFilter === filter && styles.filterChipTextActive,
                          ]}
                        >
                          {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                  {(['7days', '30days', '90days', 'year', 'all'] as TimeFilter[]).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterChip,
                        timeFilter === filter && styles.filterChipActive,
                      ]}
                      onPress={() => setTimeFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          timeFilter === filter && styles.filterChipTextActive,
                        ]}
                      >
                        {filter === 'all'
                          ? 'All Time'
                          : filter === '7days'
                          ? 'Last 7 Days'
                          : filter === '30days'
                          ? 'Last 30 Days'
                          : filter === '90days'
                          ? 'Last 90 Days'
                          : 'This Year'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {getFilteredTransactions().length > 0 ? (
                  <>
                    <View style={styles.transactionSummary}>
                      <Text style={styles.transactionSummaryText}>
                        Showing {getFilteredTransactions().length} transaction(s)
                      </Text>
                    </View>
                    <FlatList
                      data={getFilteredTransactions()}
                      renderItem={renderTransaction}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  </>
                ) : (
                  <Text style={styles.emptyText}>No transactions match your filters</Text>
                )}
              </View>
            )}

            {activeTab === 'payouts' && (
              <View style={styles.section}>
                <View style={styles.payoutRequestSection}>
                  <Text style={styles.sectionTitle}>Request Payout</Text>
                  <View style={styles.payoutForm}>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="Amount (minimum $10)"
                      placeholderTextColor={colors.textLight}
                      value={payoutAmount}
                      onChangeText={setPayoutAmount}
                      keyboardType="decimal-pad"
                    />
                    <Button
                      title="Request Payout"
                      onPress={handleRequestPayout}
                      disabled={!payoutAmount || requestingPayout}
                      loading={requestingPayout}
                    />
                  </View>
                  <Text style={styles.payoutNote}>
                    Payouts are processed within 1-3 business days
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>Payout History</Text>
                {payoutRequests.length > 0 ? (
                  <FlatList
                    data={payoutRequests}
                    renderItem={renderPayoutRequest}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  <Text style={styles.emptyText}>No payout requests yet</Text>
                )}
              </View>
            )}

            {activeTab === 'tax' && (
              <View style={styles.section}>
                <View style={styles.taxCard}>
                  <Download size={48} color={colors.primary} />
                  <Text style={styles.taxTitle}>Tax Documents</Text>
                  <Text style={styles.taxDescription}>
                    Generate your annual tax summary including total earnings and platform fees
                  </Text>
                  <Button
                    title="Generate Tax Summary"
                    onPress={handleGenerateTaxDocument}
                    style={styles.taxButton}
                  />
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: Platform.OS === 'ios' ? spacing.sm : spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
  balanceCard: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  balanceLabel: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  pendingBalance: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transactionStatus: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
  payoutRequestSection: {
    marginBottom: spacing.xl,
  },
  payoutForm: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  amountInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payoutNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  payoutCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  payoutAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  payoutStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  payoutStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  payoutDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payoutMethod: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  payoutDate: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  failureReason: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  taxCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  taxTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  taxDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  taxButton: {
    width: '100%',
  },
  viewAllButton: {
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  analyticsLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  analyticsValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  analyticsChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  analyticsChangeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  analyticsSubtext: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  exportText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  filterRow: {
    marginBottom: spacing.md,
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  transactionSummary: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  transactionSummaryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
