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
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Video,
  X,
  Calendar,
  DollarSign,
  User,
} from 'lucide-react-native';

interface Consultation {
  id: string;
  production_order_id: string;
  customer_id: string;
  provider_id: string;
  status: string;
  requested_by: string;
  timeout_at: string;
  started_at?: string;
  completed_at?: string;
  waived_at?: string;
  created_at: string;
  production_order: {
    id: string;
    title: string;
    escrow_amount: number;
    status: string;
    customer: {
      full_name: string;
    };
  };
}

type FilterType = 'all' | 'pending' | 'in_progress' | 'completed';

export default function ProviderConsultationsScreen() {
  const { profile } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultations();
  }, [filter]);

  const fetchConsultations = async () => {
    if (!profile?.id) return;

    setLoading(true);

    let query = supabase
      .from('custom_service_consultations')
      .select(`
        *,
        production_order:production_orders(
          id,
          title,
          escrow_amount,
          status,
          customer:profiles!production_orders_customer_id_fkey(full_name)
        )
      `)
      .eq('provider_id', profile.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setConsultations(data as any);
    }

    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConsultations();
    setRefreshing(false);
  }, [filter]);

  const handleStartConsultation = async (consultation: Consultation) => {
    setActionLoading(consultation.id);

    const { error } = await supabase
      .from('custom_service_consultations')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', consultation.id);

    if (!error) {
      router.push(`/call/video?orderId=${consultation.production_order_id}&consultationId=${consultation.id}` as any);
    }

    setActionLoading(null);
    fetchConsultations();
  };

  const handleCompleteConsultation = async (consultation: Consultation) => {
    setActionLoading(consultation.id);

    const result = await CustomServicePayments.completeConsultation(consultation.id);

    if (result.success) {
      fetchConsultations();
    }

    setActionLoading(null);
  };

  const handleWaiveConsultation = async (consultation: Consultation) => {
    if (!profile?.id) return;

    setActionLoading(consultation.id);

    const result = await CustomServicePayments.waiveConsultation(
      consultation.production_order_id,
      profile.id
    );

    if (result.success) {
      fetchConsultations();
    }

    setActionLoading(null);
  };

  const handleOpenChat = (consultation: Consultation) => {
    router.push(`/chat/${consultation.production_order_id}` as any);
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: colors.warning, icon: Clock, label: 'Pending' };
      case 'in_progress':
        return { color: colors.primary, icon: MessageCircle, label: 'In Progress' };
      case 'completed':
        return { color: colors.success, icon: CheckCircle, label: 'Completed' };
      case 'waived':
        return { color: colors.textSecondary, icon: X, label: 'Waived' };
      case 'timed_out':
        return { color: colors.error, icon: AlertCircle, label: 'Timed Out' };
      default:
        return { color: colors.textSecondary, icon: MessageCircle, label: status };
    }
  };

  const pendingCount = consultations.filter(c => c.status === 'pending').length;
  const inProgressCount = consultations.filter(c => c.status === 'in_progress').length;

  const renderConsultationCard = (consultation: Consultation) => {
    const statusInfo = getStatusInfo(consultation.status);
    const StatusIcon = statusInfo.icon;
    const isUrgent = consultation.status === 'pending' &&
      new Date(consultation.timeout_at).getTime() - Date.now() < 12 * 60 * 60 * 1000;

    return (
      <TouchableOpacity
        key={consultation.id}
        style={[
          styles.card,
          isUrgent && styles.urgentCard,
        ]}
        onPress={() => router.push(`/booking/${consultation.production_order_id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <StatusIcon size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          {consultation.status === 'pending' && (
            <View style={[styles.timerBadge, isUrgent && styles.urgentTimer]}>
              <Clock size={14} color={isUrgent ? colors.error : colors.textSecondary} />
              <Text style={[styles.timerText, isUrgent && styles.urgentTimerText]}>
                {getTimeRemaining(consultation.timeout_at)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.orderTitle} numberOfLines={2}>
          {consultation.production_order?.title || 'Custom Order'}
        </Text>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <User size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {consultation.production_order?.customer?.full_name || 'Customer'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <DollarSign size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {formatCurrency(consultation.production_order?.escrow_amount || 0)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {new Date(consultation.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {consultation.requested_by === 'customer' && (
          <View style={styles.requestedByBadge}>
            <Text style={styles.requestedByText}>Customer Requested</Text>
          </View>
        )}

        {consultation.status === 'pending' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => handleStartConsultation(consultation)}
              disabled={actionLoading === consultation.id}
            >
              {actionLoading === consultation.id ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Video size={18} color={colors.white} />
                  <Text style={styles.startButtonText}>Start Consultation</Text>
                </>
              )}
            </TouchableOpacity>
            {consultation.requested_by === 'customer' && (
              <TouchableOpacity
                style={styles.waiveButton}
                onPress={() => handleWaiveConsultation(consultation)}
                disabled={actionLoading === consultation.id}
              >
                <Text style={styles.waiveButtonText}>Waive</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {consultation.status === 'in_progress' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => handleOpenChat(consultation)}
            >
              <MessageCircle size={18} color={colors.primary} />
              <Text style={styles.chatButtonText}>Open Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteConsultation(consultation)}
              disabled={actionLoading === consultation.id}
            >
              {actionLoading === consultation.id ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <CheckCircle size={18} color={colors.white} />
                  <Text style={styles.completeButtonText}>Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
        <Text style={styles.headerTitle}>Consultations</Text>
        <View style={styles.headerRight} />
      </View>

      {(pendingCount > 0 || inProgressCount > 0) && (
        <View style={styles.statsBar}>
          {pendingCount > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.statText}>{pendingCount} Pending</Text>
            </View>
          )}
          {inProgressCount > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.statText}>{inProgressCount} In Progress</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.filters}>
        {(['all', 'pending', 'in_progress', 'completed'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'in_progress' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading consultations...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {consultations.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageCircle size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Consultations</Text>
              <Text style={styles.emptyText}>
                {filter === 'pending'
                  ? 'No pending consultation requests'
                  : filter === 'in_progress'
                  ? 'No active consultations'
                  : 'You have no consultation history yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {consultations.map(renderConsultationCard)}
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
  cardList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urgentCard: {
    borderColor: colors.error,
    borderWidth: 2,
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
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  urgentTimer: {
    backgroundColor: colors.error + '15',
  },
  timerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  urgentTimerText: {
    color: colors.error,
  },
  orderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
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
  requestedByBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  requestedByText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  startButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  waiveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  waiveButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  chatButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  completeButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
  bottomPadding: {
    height: spacing.xxl,
  },
});
