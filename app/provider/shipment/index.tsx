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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';

interface Shipment {
  id: string;
  production_order_id: string;
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';
  tracking_number?: string;
  shipping_carrier?: string;
  created_at: string;
  delivered_at?: string;
  production_order?: {
    title: string;
    customer: {
      full_name: string;
    };
  };
}

type FilterType = 'all' | 'pending' | 'in_transit' | 'delivered';

export default function ProviderShipmentList() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (profile?.id) {
      fetchShipments();
    }
  }, [filter, profile?.id]);

  const fetchShipments = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const { data: orders } = await supabase
      .from('production_orders')
      .select(`
        id,
        title,
        status,
        tracking_number,
        shipping_carrier,
        shipped_at,
        delivered_at,
        created_at,
        customer:profiles!production_orders_customer_id_fkey(full_name)
      `)
      .eq('provider_id', profile.id)
      .in('status', ['shipped', 'ready_for_delivery', 'completed'])
      .order('shipped_at', { ascending: false });

    if (orders) {
      const mappedShipments: Shipment[] = orders.map(order => ({
        id: order.id,
        production_order_id: order.id,
        status: order.status === 'completed'
          ? 'delivered'
          : order.status === 'shipped'
          ? 'in_transit'
          : 'pending',
        tracking_number: order.tracking_number,
        shipping_carrier: order.shipping_carrier,
        created_at: order.shipped_at || order.created_at,
        delivered_at: order.delivered_at,
        production_order: {
          title: order.title,
          customer: order.customer as any,
        },
      }));

      let filtered = mappedShipments;
      if (filter !== 'all') {
        filtered = mappedShipments.filter(s => s.status === filter);
      }

      setShipments(filtered);
    }

    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchShipments();
    setRefreshing(false);
  }, [filter, profile?.id]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Ready to Ship', color: colors.warning, Icon: Clock };
      case 'in_transit':
        return { label: 'In Transit', color: colors.info, Icon: Truck };
      case 'out_for_delivery':
        return { label: 'Out for Delivery', color: colors.primary, Icon: MapPin };
      case 'delivered':
        return { label: 'Delivered', color: colors.success, Icon: CheckCircle };
      case 'cancelled':
        return { label: 'Cancelled', color: colors.error, Icon: AlertCircle };
      default:
        return { label: status, color: colors.textSecondary, Icon: Package };
    }
  };

  const renderShipmentCard = (shipment: Shipment) => {
    const statusInfo = getStatusInfo(shipment.status);
    const StatusIcon = statusInfo.Icon;

    return (
      <TouchableOpacity
        key={shipment.id}
        style={styles.shipmentCard}
        onPress={() => router.push(`/provider/shipment/${shipment.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <StatusIcon size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textLight} />
        </View>

        <Text style={styles.orderTitle} numberOfLines={1}>
          {shipment.production_order?.title || 'Custom Order'}
        </Text>

        <View style={styles.cardDetails}>
          <Text style={styles.customerName}>
            To: {shipment.production_order?.customer?.full_name || 'Customer'}
          </Text>
          {shipment.tracking_number && (
            <Text style={styles.trackingNumber}>
              Tracking: {shipment.tracking_number}
            </Text>
          )}
          <Text style={styles.dateText}>
            {shipment.status === 'delivered' && shipment.delivered_at
              ? `Delivered ${new Date(shipment.delivered_at).toLocaleDateString()}`
              : `Shipped ${new Date(shipment.created_at).toLocaleDateString()}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const pendingCount = shipments.filter(s => s.status === 'pending').length;
  const inTransitCount = shipments.filter(s => s.status === 'in_transit').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack('/provider/dashboard')}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipments</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>To Ship</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.info }]}>{inTransitCount}</Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {shipments.filter(s => s.status === 'delivered').length}
          </Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {(['all', 'pending', 'in_transit', 'delivered'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'in_transit' ? 'In Transit' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading shipments...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {shipments.length === 0 ? (
            <View style={styles.emptyState}>
              <Truck size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Shipments</Text>
              <Text style={styles.emptyText}>
                {filter === 'pending'
                  ? 'No orders ready to ship'
                  : filter === 'in_transit'
                  ? 'No shipments in transit'
                  : filter === 'delivered'
                  ? 'No delivered shipments'
                  : 'No shipments found'}
              </Text>
            </View>
          ) : (
            <View style={styles.shipmentList}>
              {shipments.map(renderShipmentCard)}
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
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
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
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  shipmentList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  shipmentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    gap: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  orderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardDetails: {
    gap: 4,
  },
  customerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  trackingNumber: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
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
