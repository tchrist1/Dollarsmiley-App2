import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
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
  DollarSign,
  Truck,
  Shield,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react-native';

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

const EVENT_ICONS: Record<string, any> = {
  order_created: Package,
  payment_captured: DollarSign,
  consultation_created: MessageCircle,
  consultation_completed: CheckCircle,
  consultation_waived: X,
  consultation_timeout: AlertCircle,
  price_adjustment_requested: DollarSign,
  price_adjustment_approved: CheckCircle,
  price_adjustment_rejected: X,
  order_received: CheckCircle,
  production_started: Package,
  proof_submitted: FileText,
  proof_approved: CheckCircle,
  proof_rejected: RefreshCw,
  ready_for_delivery: Truck,
  shipped: Truck,
  delivered: CheckCircle,
  escrow_released: Shield,
  escrow_refunded: RefreshCw,
  order_cancelled: X,
};

const EVENT_COLORS: Record<string, string> = {
  order_created: colors.primary,
  payment_captured: colors.success,
  consultation_created: colors.warning,
  consultation_completed: colors.success,
  consultation_waived: colors.textSecondary,
  consultation_timeout: colors.error,
  price_adjustment_requested: colors.warning,
  price_adjustment_approved: colors.success,
  price_adjustment_rejected: colors.error,
  order_received: colors.primary,
  production_started: colors.primary,
  proof_submitted: colors.primary,
  proof_approved: colors.success,
  proof_rejected: colors.warning,
  ready_for_delivery: colors.success,
  shipped: colors.success,
  delivered: colors.success,
  escrow_released: colors.success,
  escrow_refunded: colors.warning,
  order_cancelled: colors.error,
};

export default function OrderTimelineScreen() {
  const { id } = useLocalSearchParams();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [orderTitle, setOrderTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [id]);

  const fetchTimeline = async () => {
    if (!id) return;

    setLoading(true);

    const { data: orderData } = await supabase
      .from('production_orders')
      .select('title')
      .eq('id', id)
      .single();

    if (orderData) {
      setOrderTitle(orderData.title);
    }

    const { data, error } = await supabase
      .from('production_timeline_events')
      .select('*')
      .eq('production_order_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEvents(data);
    }

    setLoading(false);
  };

  const getEventIcon = (eventType: string) => {
    return EVENT_ICONS[eventType] || Clock;
  };

  const getEventColor = (eventType: string) => {
    return EVENT_COLORS[eventType] || colors.textSecondary;
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderMetadata = (event: TimelineEvent) => {
    if (!event.metadata) return null;

    const { metadata } = event;

    if (metadata.original_price !== undefined && metadata.adjusted_price !== undefined) {
      return (
        <View style={styles.metadataCard}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Original Price</Text>
            <Text style={styles.metadataValue}>{formatCurrency(metadata.original_price)}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>New Price</Text>
            <Text style={[styles.metadataValue, styles.metadataHighlight]}>
              {formatCurrency(metadata.adjusted_price)}
            </Text>
          </View>
          {metadata.justification && (
            <View style={styles.metadataJustification}>
              <Text style={styles.metadataLabel}>Reason</Text>
              <Text style={styles.metadataText}>{metadata.justification}</Text>
            </View>
          )}
        </View>
      );
    }

    if (metadata.escrow_amount !== undefined) {
      return (
        <View style={styles.metadataCard}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Amount</Text>
            <Text style={[styles.metadataValue, styles.metadataHighlight]}>
              {formatCurrency(metadata.escrow_amount)}
            </Text>
          </View>
        </View>
      );
    }

    if (metadata.refund_amount !== undefined) {
      return (
        <View style={styles.metadataCard}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Refunded</Text>
            <Text style={[styles.metadataValue, styles.metadataHighlight]}>
              {formatCurrency(metadata.refund_amount)}
            </Text>
          </View>
          {metadata.reason && (
            <View style={styles.metadataJustification}>
              <Text style={styles.metadataLabel}>Reason</Text>
              <Text style={styles.metadataText}>{metadata.reason}</Text>
            </View>
          )}
        </View>
      );
    }

    if (metadata.provider_amount !== undefined && metadata.platform_fee !== undefined) {
      return (
        <View style={styles.metadataCard}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Provider Receives</Text>
            <Text style={[styles.metadataValue, styles.metadataHighlight]}>
              {formatCurrency(metadata.provider_amount)}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Platform Fee</Text>
            <Text style={styles.metadataValue}>{formatCurrency(metadata.platform_fee)}</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={safeGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Order Timeline</Text>
          {orderTitle && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {orderTitle}
            </Text>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptyText}>
              Order activity will appear here as it happens
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {events.map((event, index) => {
              const EventIcon = getEventIcon(event.event_type);
              const eventColor = getEventColor(event.event_type);

              return (
                <View key={event.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: eventColor + '20' }]}>
                      <EventIcon size={18} color={eventColor} />
                    </View>
                    {index < events.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>

                  <View style={styles.timelineRight}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventDescription}>{event.description}</Text>
                      <Text style={styles.eventTime}>{formatEventDate(event.created_at)}</Text>
                    </View>
                    <Text style={styles.eventFullDate}>{formatFullDate(event.created_at)}</Text>
                    {renderMetadata(event)}
                  </View>
                </View>
              );
            })}
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
  headerContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
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
  },
  timeline: {
    padding: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    minHeight: 20,
  },
  timelineRight: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  eventDescription: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginRight: spacing.sm,
  },
  eventTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  eventFullDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metadataCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metadataLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  metadataValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  metadataHighlight: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  metadataJustification: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metadataText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
