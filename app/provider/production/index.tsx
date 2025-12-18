import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/lib/navigation-utils';
import { ProductionManagement, ProductionOrder, PRODUCTION_STATUSES } from '@/lib/production-management';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  Truck,
  DollarSign,
  Calendar,
  User,
  ChevronRight,
  Play,
  Eye,
} from 'lucide-react-native';

type FilterType = 'all' | 'active' | 'pending_approval' | 'completed';

export default function ProviderProductionDashboard() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('active');
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    pendingProofs: 0,
    completedOrders: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      fetchOrders();
      fetchStats();
    }
  }, [filter, profile?.id]);

  const fetchOrders = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const filterValue = filter === 'active' ? 'active' : filter === 'all' ? undefined : filter;
    const { data } = await ProductionManagement.getProviderOrders(profile.id, filterValue);
    setOrders(data);
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!profile?.id) return;
    const statsData = await ProductionManagement.getProviderStats(profile.id);
    setStats(statsData);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchStats()]);
    setRefreshing(false);
  }, [filter, profile?.id]);

  const getStatusInfo = (status: string) => {
    const config = PRODUCTION_STATUSES[status as keyof typeof PRODUCTION_STATUSES];
    return config || { label: status, color: colors.textSecondary };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_consultation':
      case 'pending_order_received':
        return Clock;
      case 'order_received':
      case 'in_production':
        return Package;
      case 'pending_approval':
        return Eye;
      case 'ready_for_delivery':
      case 'shipped':
        return Truck;
      case 'completed':
        return CheckCircle;
      case 'cancelled':
        return AlertCircle;
      default:
        return Package;
    }
  };

  const getActionButton = (order: ProductionOrder) => {
    switch (order.status) {
      case 'pending_order_received':
        return { label: 'Confirm Receipt', action: 'receive' };
      case 'order_received':
        return { label: 'Start Production', action: 'start' };
      case 'in_production':
        return { label: 'Submit Proof', action: 'proof' };
      case 'ready_for_delivery':
        return { label: 'Mark Shipped', action: 'ship' };
      default:
        return null;
    }
  };

  const handleAction = async (order: ProductionOrder, action: string) => {
    if (!profile?.id) return;

    switch (action) {
      case 'receive':
        await ProductionManagement.receiveOrder(order.id, profile.id);
        break;
      case 'start':
        await ProductionManagement.startProduction(order.id, profile.id);
        break;
      case 'proof':
        router.push(`/provider/production/${order.id}/submit-proof` as any);
        return;
      case 'ship':
        router.push(`/provider/shipment/${order.id}` as any);
        return;
    }
    fetchOrders();
    fetchStats();
  };

  const renderOrderCard = (order: ProductionOrder) => {
    const statusInfo = getStatusInfo(order.status);
    const StatusIcon = getStatusIcon(order.status);
    const actionButton = getActionButton(order);
    const needsAttention = ['pending_order_received', 'pending_approval'].includes(order.status);

    return (
      <TouchableOpacity
        key={order.id}
        style={[styles.orderCard, needsAttention && styles.attentionCard]}
        onPress={() => router.push(`/provider/production/${order.id}` as any)}
      >
        {needsAttention && (
          <View style={styles.attentionBanner}>
            <AlertCircle size={14} color={colors.white} />
            <Text style={styles.attentionText}>Action Required</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <StatusIcon size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textLight} />
        </View>

        <Text style={styles.orderTitle} numberOfLines={2}>
          {order.title || 'Custom Order'}
        </Text>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <User size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {order.customer?.full_name || 'Customer'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <DollarSign size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {formatCurrency((order.escrow_amount || 0) * 0.85)} earnings
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {new Date(order.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {actionButton && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(order, actionButton.action)}
          >
            {actionButton.action === 'proof' ? (
              <Camera size={18} color={colors.white} />
            ) : actionButton.action === 'start' ? (
              <Play size={18} color={colors.white} />
            ) : actionButton.action === 'ship' ? (
              <Truck size={18} color={colors.white} />
            ) : (
              <CheckCircle size={18} color={colors.white} />
            )}
            <Text style={styles.actionButtonText}>{actionButton.label}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack('/provider/dashboard')}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Production Orders</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeOrders}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {stats.pendingProofs}
            </Text>
            <Text style={styles.statLabel}>Awaiting Approval</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(stats.pendingEarnings)}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      <View style={styles.filters}>
        {(['active', 'pending_approval', 'completed', 'all'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'pending_approval' ? 'Proofs' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Orders</Text>
              <Text style={styles.emptyText}>
                {filter === 'active'
                  ? 'You have no active production orders'
                  : filter === 'pending_approval'
                  ? 'No orders awaiting customer approval'
                  : filter === 'completed'
                  ? 'No completed orders yet'
                  : 'No production orders found'}
              </Text>
            </View>
          ) : (
            <View style={styles.orderList}>
              {orders.map(renderOrderCard)}
            </View>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerRight: {
    width: 40,
  },
  statsSection: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  filterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  orderList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attentionCard: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  attentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  attentionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  orderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bottomPadding: {
    height: spacing.xxxl,
  },
});
