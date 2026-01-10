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
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Truck,
  CreditCard,
  ChevronRight,
  Filter,
  DollarSign,
  Calendar,
} from 'lucide-react-native';

interface Order {
  id: string;
  title: string;
  status: string;
  escrow_amount: number;
  final_price?: number;
  consultation_required: boolean;
  consultation_requested: boolean;
  consultation_completed_at?: string;
  order_received_at?: string;
  escrow_released_at?: string;
  created_at: string;
  provider: {
    full_name: string;
  };
  consultation?: {
    id: string;
    status: string;
  };
  price_adjustment?: {
    id: string;
    status: string;
    adjusted_price: number;
    adjustment_type: string;
  };
}

type FilterType = 'all' | 'active' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: any;
  description: string;
}> = {
  pending_consultation: {
    label: 'Awaiting Consultation',
    color: '#F59E0B',
    icon: MessageCircle,
    description: 'Provider will schedule a consultation',
  },
  pending_order_received: {
    label: 'Pending Confirmation',
    color: '#3B82F6',
    icon: Clock,
    description: 'Waiting for provider to receive order',
  },
  order_received: {
    label: 'Order Received',
    color: '#8B5CF6',
    icon: CheckCircle,
    description: 'Provider is working on your order',
  },
  in_production: {
    label: 'In Production',
    color: '#8B5CF6',
    icon: Package,
    description: 'Your order is being created',
  },
  pending_approval: {
    label: 'Awaiting Approval',
    color: '#F59E0B',
    icon: AlertCircle,
    description: 'Review proofs and approve',
  },
  ready_for_delivery: {
    label: 'Ready for Delivery',
    color: '#10B981',
    icon: Truck,
    description: 'Order is ready to be shipped',
  },
  shipped: {
    label: 'Shipped',
    color: '#10B981',
    icon: Truck,
    description: 'Order is on its way',
  },
  completed: {
    label: 'Completed',
    color: '#059669',
    icon: CheckCircle,
    description: 'Order has been delivered',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#EF4444',
    icon: AlertCircle,
    description: 'Order was cancelled',
  },
};

export default function OrdersIndexScreen() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    if (!profile?.id) return;

    setLoading(true);

    let query = supabase
      .from('production_orders')
      .select(`
        *,
        provider:profiles!production_orders_provider_id_fkey(full_name),
        consultation:custom_service_consultations(id, status),
        price_adjustment:price_adjustments(id, status, adjusted_price, adjustment_type)
      `)
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false });

    if (filter === 'active') {
      query = query.not('status', 'in', '("completed","cancelled")');
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed');
    } else if (filter === 'cancelled') {
      query = query.eq('status', 'cancelled');
    }

    const { data, error } = await query;

    if (!error && data) {
      const processedOrders = data.map((order: any) => ({
        ...order,
        consultation: order.consultation?.[0] || null,
        price_adjustment: order.price_adjustment?.find((pa: any) => pa.status === 'pending') || null,
      }));
      setOrders(processedOrders);
    }

    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [filter]);

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || {
      label: status,
      color: colors.textSecondary,
      icon: Package,
      description: '',
    };
  };

  const activeCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const pendingActionCount = orders.filter(o =>
    o.price_adjustment?.status === 'pending' ||
    (o.consultation?.status === 'pending' && o.consultation_requested)
  ).length;

  const renderOrderCard = (order: Order) => {
    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;
    const hasPendingAction = order.price_adjustment?.status === 'pending';
    const price = order.final_price || order.escrow_amount || 0;

    return (
      <TouchableOpacity
        key={order.id}
        style={[styles.orderCard, hasPendingAction && styles.actionRequiredCard]}
        onPress={() => router.push(`/orders/${order.id}` as any)}
      >
        {hasPendingAction && (
          <View style={styles.actionBanner}>
            <AlertCircle size={14} color={colors.white} />
            <Text style={styles.actionBannerText}>Action Required</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <StatusIcon size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textLight} />
        </View>

        <Text style={styles.orderTitle} numberOfLines={2}>
          {order.title || 'Custom Order'}
        </Text>

        <Text style={styles.statusDescription}>{statusConfig.description}</Text>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Package size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {order.provider?.full_name || 'Provider'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <DollarSign size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {formatCurrency(price)}
              {order.escrow_released_at ? ' (Paid)' : ' (In Escrow)'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {new Date(order.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {order.consultation && order.consultation.status === 'pending' && (
          <View style={styles.consultationBadge}>
            <MessageCircle size={14} color={colors.primary} />
            <Text style={styles.consultationText}>Consultation Pending</Text>
          </View>
        )}

        {order.price_adjustment && order.price_adjustment.status === 'pending' && (
          <View style={styles.priceAdjustmentBadge}>
            <DollarSign size={14} color={colors.warning} />
            <Text style={styles.priceAdjustmentText}>
              Price {order.price_adjustment.adjustment_type === 'increase' ? 'Increase' : 'Decrease'} Request
            </Text>
          </View>
        )}

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: statusConfig.color },
              getProgressWidth(order.status),
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const getProgressWidth = (status: string) => {
    const progressMap: Record<string, number> = {
      pending_consultation: 10,
      pending_order_received: 20,
      order_received: 40,
      in_production: 60,
      pending_approval: 70,
      ready_for_delivery: 85,
      shipped: 90,
      completed: 100,
      cancelled: 0,
    };
    return { width: `${progressMap[status] || 0}%` as any };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={safeGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerRight} />
      </View>

      {(activeCount > 0 || pendingActionCount > 0) && (
        <View style={styles.statsBar}>
          {activeCount > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.statText}>{activeCount} Active</Text>
            </View>
          )}
          {pendingActionCount > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.statText}>{pendingActionCount} Need Action</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.filters}>
        {(['all', 'active', 'completed', 'cancelled'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
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
                  ? 'You have no active custom orders'
                  : filter === 'completed'
                  ? 'You have no completed orders yet'
                  : filter === 'cancelled'
                  ? 'No cancelled orders'
                  : 'Order a custom service to see it here'}
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.browseButtonText}>Browse Services</Text>
              </TouchableOpacity>
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filters: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filterTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
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
  orderList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionRequiredCard: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopLeftRadius: borderRadius.lg - 2,
    borderTopRightRadius: borderRadius.lg - 2,
    gap: spacing.xs,
  },
  actionBannerText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  orderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardDetails: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  consultationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  consultationText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  priceAdjustmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  priceAdjustmentText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  browseButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  browseButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
