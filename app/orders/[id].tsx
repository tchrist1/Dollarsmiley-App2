import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/lib/navigation-utils';
import { supabase } from '@/lib/supabase';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { formatCurrency } from '@/lib/currency-utils';
import ConsultationRequestCard from '@/components/ConsultationRequestCard';
import PriceAdjustmentCard from '@/components/PriceAdjustmentCard';
import DeliveryConfirmationCard from '@/components/DeliveryConfirmationCard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Truck,
  DollarSign,
  Calendar,
  User,
  Shield,
  ChevronRight,
} from 'lucide-react-native';

interface OrderDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  escrow_amount: number;
  final_price?: number;
  consultation_required: boolean;
  consultation_requested: boolean;
  consultation_completed_at?: string;
  consultation_waived: boolean;
  order_received_at?: string;
  escrow_released_at?: string;
  price_adjustment_allowed: boolean;
  price_adjustment_used: boolean;
  provider_response_deadline?: string;
  customer_response_deadline?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  created_at: string;
  provider_id: string;
  customer_id: string;
  provider: {
    full_name: string;
    rating_average?: number;
  };
}

interface Consultation {
  id: string;
  status: string;
  requested_by: string;
  started_at?: string;
  completed_at?: string;
  waived_at?: string;
  timeout_at?: string;
}

interface PriceAdjustment {
  id: string;
  original_price: number;
  adjusted_price: number;
  adjustment_amount: number;
  adjustment_type: 'increase' | 'decrease';
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  response_deadline?: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: any;
  description: string;
  step: number;
}> = {
  pending_consultation: {
    label: 'Awaiting Consultation',
    color: '#F59E0B',
    icon: MessageCircle,
    description: 'Provider will schedule a consultation to discuss your requirements',
    step: 1,
  },
  pending_order_received: {
    label: 'Pending Confirmation',
    color: '#3B82F6',
    icon: Clock,
    description: 'Waiting for provider to confirm and receive your order',
    step: 2,
  },
  order_received: {
    label: 'Order Received',
    color: '#8B5CF6',
    icon: CheckCircle,
    description: 'Provider has received your order and will begin work soon',
    step: 3,
  },
  in_production: {
    label: 'In Production',
    color: '#8B5CF6',
    icon: Package,
    description: 'Your custom order is being created',
    step: 4,
  },
  pending_approval: {
    label: 'Awaiting Your Approval',
    color: '#F59E0B',
    icon: AlertCircle,
    description: 'Review the proofs and approve to proceed',
    step: 5,
  },
  ready_for_delivery: {
    label: 'Ready for Delivery',
    color: '#10B981',
    icon: Truck,
    description: 'Your order is complete and ready to be shipped',
    step: 6,
  },
  shipped: {
    label: 'Shipped',
    color: '#10B981',
    icon: Truck,
    description: 'Your order is on its way',
    step: 6,
  },
  completed: {
    label: 'Completed',
    color: '#059669',
    icon: CheckCircle,
    description: 'Order has been delivered successfully',
    step: 7,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#EF4444',
    icon: AlertCircle,
    description: 'This order has been cancelled',
    step: 0,
  },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [priceAdjustment, setPriceAdjustment] = useState<PriceAdjustment | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    if (!id) return;

    setLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from('production_orders')
      .select(`
        *,
        provider:profiles!production_orders_provider_id_fkey(full_name, rating_average)
      `)
      .eq('id', id)
      .single();

    if (orderError || !orderData) {
      setLoading(false);
      return;
    }

    setOrder(orderData as any);

    const { data: consultationData } = await supabase
      .from('custom_service_consultations')
      .select('*')
      .eq('production_order_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (consultationData) {
      setConsultation(consultationData);
    }

    const { data: adjustmentData } = await supabase
      .from('price_adjustments')
      .select('*')
      .eq('production_order_id', id)
      .eq('status', 'pending')
      .maybeSingle();

    if (adjustmentData) {
      setPriceAdjustment(adjustmentData);
    }

    const { data: timelineData } = await supabase
      .from('production_timeline_events')
      .select('*')
      .eq('production_order_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (timelineData) {
      setTimeline(timelineData);
    }

    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    setRefreshing(false);
  }, [id]);

  const handleOpenChat = () => {
    if (order) {
      router.push(`/chat/${order.id}` as any);
    }
  };

  const handleViewTimeline = () => {
    router.push(`/orders/${id}/timeline` as any);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || {
      label: status,
      color: colors.textSecondary,
      icon: Package,
      description: '',
      step: 0,
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorText}>This order may have been removed or you don't have access.</Text>
        <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const price = order.final_price || order.escrow_amount || 0;
  const isCustomer = profile?.id === order.customer_id;
  const isProvider = profile?.id === order.provider_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack('/orders')}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity style={styles.chatButton} onPress={handleOpenChat}>
          <MessageCircle size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <StatusIcon size={20} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.statusDescription}>{statusConfig.description}</Text>

          <View style={styles.progressSteps}>
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <View key={step} style={styles.stepContainer}>
                <View
                  style={[
                    styles.stepDot,
                    step <= statusConfig.step && { backgroundColor: statusConfig.color },
                    step === statusConfig.step && styles.currentStep,
                  ]}
                />
                {step < 7 && (
                  <View
                    style={[
                      styles.stepLine,
                      step < statusConfig.step && { backgroundColor: statusConfig.color },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.orderTitle}>{order.title || 'Custom Order'}</Text>
          {order.description && (
            <Text style={styles.orderDescription}>{order.description}</Text>
          )}
        </View>

        <View style={styles.escrowSection}>
          <View style={styles.escrowHeader}>
            <Shield size={20} color={colors.success} />
            <Text style={styles.escrowTitle}>Payment Protected</Text>
          </View>
          <Text style={styles.escrowDescription}>
            {order.escrow_released_at
              ? 'Payment has been released to the provider'
              : 'Your payment is held securely in escrow until the order is complete'}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceValue}>{formatCurrency(price)}</Text>
          </View>
        </View>

        {consultation && (order.consultation_required || order.consultation_requested) && (
          <View style={styles.section}>
            <ConsultationRequestCard
              consultation={consultation}
              isProvider={isProvider}
              providerDeadline={order.provider_response_deadline}
              customerDeadline={order.customer_response_deadline}
              onOpenChat={handleOpenChat}
            />
          </View>
        )}

        {isCustomer && (
          <View style={styles.section}>
            <PriceAdjustmentCard
              adjustment={priceAdjustment || undefined}
              isProvider={false}
              orderId={order.id}
              currentPrice={price}
              canRequestAdjustment={false}
              onAdjustmentResolved={fetchOrderDetails}
            />
          </View>
        )}

        {isCustomer && ['shipped', 'ready_for_delivery', 'completed'].includes(order.status) && (
          <View style={styles.section}>
            <DeliveryConfirmationCard
              orderId={order.id}
              customerId={profile?.id || ''}
              orderStatus={order.status}
              trackingNumber={order.tracking_number}
              shippingCarrier={order.shipping_carrier}
              onConfirmDelivery={fetchOrderDetails}
              onReportIssue={() => router.push(`/refund/request/${order.id}` as any)}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provider</Text>
          <TouchableOpacity style={styles.providerCard}>
            <View style={styles.providerAvatar}>
              <Text style={styles.providerInitial}>
                {order.provider?.full_name?.charAt(0) || 'P'}
              </Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>
                {order.provider?.full_name || 'Provider'}
              </Text>
              {order.provider?.rating_average && (
                <Text style={styles.providerRating}>
                  Rating: {order.provider.rating_average.toFixed(1)}
                </Text>
              )}
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Calendar size={18} color={colors.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Order Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <DollarSign size={18} color={colors.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Payment Status</Text>
                <Text style={styles.detailValue}>
                  {order.escrow_released_at ? 'Released to Provider' : 'Held in Escrow'}
                </Text>
              </View>
            </View>
            {order.consultation_required && (
              <View style={styles.detailRow}>
                <MessageCircle size={18} color={colors.textSecondary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Consultation</Text>
                  <Text style={styles.detailValue}>
                    {order.consultation_completed_at
                      ? 'Completed'
                      : order.consultation_waived
                      ? 'Waived'
                      : 'Required'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {timeline.length > 0 && (
          <View style={styles.section}>
            <View style={styles.timelineHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={handleViewTimeline}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timelineCard}>
              {timeline.slice(0, 3).map((event, index) => (
                <View key={event.id} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  {index < Math.min(timeline.length - 1, 2) && (
                    <View style={styles.timelineLine} />
                  )}
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineDescription}>{event.description}</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(event.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  chatButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButtonLarge: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  statusSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  statusDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  currentStep: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.white,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  orderTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  orderDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  escrowSection: {
    backgroundColor: colors.success + '10',
    padding: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  escrowTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  escrowDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  providerInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  providerRating: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingLeft: spacing.sm,
    position: 'relative',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    position: 'absolute',
    left: 0,
    top: 4,
  },
  timelineLine: {
    width: 2,
    backgroundColor: colors.border,
    position: 'absolute',
    left: 4,
    top: 16,
    bottom: -8,
  },
  timelineContent: {
    flex: 1,
    marginLeft: spacing.lg,
    paddingBottom: spacing.md,
  },
  timelineDescription: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  timelineDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
