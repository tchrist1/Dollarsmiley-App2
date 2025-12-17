import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  TrendingUp,
  AlertCircle,
  Search,
} from 'lucide-react-native';
import {
  getAllRefunds,
  getRefundMetrics,
  getRefundQueue,
  exportRefundData,
  formatCurrency,
  type AdminRefund,
  type RefundMetrics,
  type RefundQueueItem,
  type RefundStatus,
} from '@/lib/admin-refund-management';
import RefundRequestCard from '@/components/RefundRequestCard';
import RefundDetailsModal from '@/components/RefundDetailsModal';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

type TabType = 'all' | 'pending' | 'completed' | 'failed' | 'queue';

export default function AdminRefundsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<AdminRefund[]>([]);
  const [queueItems, setQueueItems] = useState<RefundQueueItem[]>([]);
  const [metrics, setMetrics] = useState<RefundMetrics | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<AdminRefund | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [refunds, searchQuery, activeTab]);

  const loadData = async () => {
    try {
      const [refundsData, metricsData, queueData] = await Promise.all([
        getAllRefunds(),
        getRefundMetrics(),
        activeTab === 'queue' ? getRefundQueue() : Promise.resolve([]),
      ]);

      setRefunds(refundsData);
      setMetrics(metricsData);
      setQueueItems(queueData);
    } catch (error) {
      console.error('Error loading refund data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = refunds;

    // Filter by status based on active tab
    if (activeTab === 'pending') {
      filtered = filtered.filter((r) => r.status === 'Pending');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter((r) => r.status === 'Completed');
    } else if (activeTab === 'failed') {
      filtered = filtered.filter((r) => r.status === 'Failed');
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (refund) =>
          refund.booking?.title?.toLowerCase().includes(searchLower) ||
          refund.requester?.full_name?.toLowerCase().includes(searchLower) ||
          refund.requester?.email?.toLowerCase().includes(searchLower) ||
          refund.reason?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredRefunds(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExport = async () => {
    Alert.alert('Export Refunds', 'Choose export format', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'CSV',
        onPress: async () => {
          const result = await exportRefundData('csv');
          if (result.success) {
            Alert.alert('Success', 'Refund data exported successfully');
          } else {
            Alert.alert('Error', result.error || 'Failed to export data');
          }
        },
      },
      {
        text: 'JSON',
        onPress: async () => {
          const result = await exportRefundData('json');
          if (result.success) {
            Alert.alert('Success', 'Refund data exported successfully');
          } else {
            Alert.alert('Error', result.error || 'Failed to export data');
          }
        },
      },
    ]);
  };

  const handleRefundPress = (refund: AdminRefund) => {
    setSelectedRefund(refund);
    setShowDetailsModal(true);
  };

  const handleModalClose = () => {
    setShowDetailsModal(false);
    setSelectedRefund(null);
  };

  const handleRefundSuccess = () => {
    loadData();
  };

  const renderMetrics = () => {
    if (!metrics) return null;

    return (
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { borderLeftColor: colors.warning }]}>
          <Clock size={20} color={colors.warning} />
          <Text style={styles.metricValue}>{metrics.pending_refunds}</Text>
          <Text style={styles.metricLabel}>Pending</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: colors.success }]}>
          <CheckCircle size={20} color={colors.success} />
          <Text style={styles.metricValue}>{metrics.completed_refunds}</Text>
          <Text style={styles.metricLabel}>Completed</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: colors.error }]}>
          <XCircle size={20} color={colors.error} />
          <Text style={styles.metricValue}>{metrics.failed_refunds}</Text>
          <Text style={styles.metricLabel}>Failed</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: colors.primary }]}>
          <DollarSign size={20} color={colors.primary} />
          <Text style={styles.metricValue}>
            {formatCurrency(metrics.total_refunded_amount)}
          </Text>
          <Text style={styles.metricLabel}>Total Refunded</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: colors.info }]}>
          <TrendingUp size={20} color={colors.info} />
          <Text style={styles.metricValue}>{metrics.refunds_this_month}</Text>
          <Text style={styles.metricLabel}>This Month</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: colors.info }]}>
          <DollarSign size={20} color={colors.info} />
          <Text style={styles.metricValue}>
            {formatCurrency(metrics.avg_refund_amount)}
          </Text>
          <Text style={styles.metricLabel}>Avg Refund</Text>
        </View>
      </View>
    );
  };

  const renderQueueTab = () => {
    if (queueItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No items in queue</Text>
          <Text style={styles.emptySubtext}>All refunds have been processed</Text>
        </View>
      );
    }

    return (
      <View style={styles.queueList}>
        {queueItems.map((item) => (
          <View key={item.id} style={styles.queueCard}>
            <View style={styles.queueHeader}>
              <View style={styles.queueInfo}>
                <Text style={styles.queueTitle}>
                  {item.booking?.title || 'Booking'}
                </Text>
                <Text style={styles.queueCustomer}>
                  {item.booking?.customer?.full_name}
                </Text>
              </View>
              <View
                style={[
                  styles.queueStatusBadge,
                  { backgroundColor: getQueueStatusColor(item.status) },
                ]}
              >
                <Text style={styles.queueStatusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.queueDetails}>
              <View style={styles.queueDetailRow}>
                <Text style={styles.queueDetailLabel}>Amount:</Text>
                <Text style={styles.queueDetailValue}>
                  {formatCurrency(item.refund_amount)}
                </Text>
              </View>
              <View style={styles.queueDetailRow}>
                <Text style={styles.queueDetailLabel}>Attempts:</Text>
                <Text style={styles.queueDetailValue}>
                  {item.attempts} / {item.max_attempts}
                </Text>
              </View>
              {item.error_message && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={colors.error} />
                  <Text style={styles.errorText}>{item.error_message}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const getQueueStatusColor = (status: string): string => {
    const colors_map: Record<string, string> = {
      Pending: colors.warning,
      Processing: colors.info,
      Completed: colors.success,
      Failed: colors.error,
    };
    return colors_map[status] || colors.textSecondary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Refund Management</Text>
          {metrics && (
            <Text style={styles.subtitle}>
              {metrics.total_refunds} total refunds
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Download size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {renderMetrics()}

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search refunds..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Clock
            size={18}
            color={
              activeTab === 'pending' ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'pending' && styles.activeTabText,
            ]}
          >
            Pending
          </Text>
          {metrics && metrics.pending_refunds > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{metrics.pending_refunds}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <CheckCircle
            size={18}
            color={
              activeTab === 'completed' ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'failed' && styles.activeTab]}
          onPress={() => setActiveTab('failed')}
        >
          <XCircle
            size={18}
            color={activeTab === 'failed' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'failed' && styles.activeTabText,
            ]}
          >
            Failed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'queue' && styles.activeTab]}
          onPress={() => setActiveTab('queue')}
        >
          <AlertCircle
            size={18}
            color={activeTab === 'queue' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.tabText, activeTab === 'queue' && styles.activeTabText]}
          >
            Queue
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'queue' ? (
          renderQueueTab()
        ) : (
          <View style={styles.refundsList}>
            {filteredRefunds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <XCircle size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'No refunds found'
                    : `No ${activeTab} refunds`}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Refunds will appear here when available'}
                </Text>
              </View>
            ) : (
              filteredRefunds.map((refund) => (
                <RefundRequestCard
                  key={refund.id}
                  refund={refund}
                  onPress={() => handleRefundPress(refund)}
                  showActions={refund.status === 'Pending'}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      <RefundDetailsModal
        visible={showDetailsModal}
        refund={selectedRefund}
        onClose={handleModalClose}
        onSuccess={handleRefundSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  exportButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  tabBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  refundsList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  queueList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  queueCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  queueInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  queueTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  queueCustomer: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  queueStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  queueStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  queueDetails: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  queueDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueDetailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  queueDetailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
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
});
