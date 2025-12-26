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
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/lib/navigation-utils';
import { supabase } from '@/lib/supabase';
import {
  ProductionManagement,
  ProductionOrder,
  ProductionProof,
  TimelineEvent,
  PRODUCTION_STATUSES,
} from '@/lib/production-management';
import { formatCurrency } from '@/lib/currency-utils';
import ProofApprovalCard from '@/components/ProofApprovalCard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Camera,
  Truck,
  DollarSign,
  Calendar,
  User,
  Play,
  ChevronRight,
  Send,
  Eye,
  X,
} from 'lucide-react-native';

interface ListingInfo {
  id: string;
  title: string;
  listing_type: string;
  proofing_required: boolean;
}

export default function ProviderProductionOrderDetail() {
  const { orderId } = useLocalSearchParams();
  const { profile } = useAuth();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [proofs, setProofs] = useState<ProductionProof[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    if (!orderId || typeof orderId !== 'string') return;

    setLoading(true);

    const [orderResult, proofsResult, timelineResult] = await Promise.all([
      ProductionManagement.getOrderDetails(orderId),
      ProductionManagement.getProofs(orderId),
      ProductionManagement.getTimelineEvents(orderId),
    ]);

    if (orderResult.data) {
      setOrder(orderResult.data);

      if (orderResult.data.listing?.id) {
        const { data: listingData } = await supabase
          .from('service_listings')
          .select('id, title, listing_type, proofing_required')
          .eq('id', orderResult.data.listing.id)
          .maybeSingle();

        if (listingData) {
          setListing(listingData);
        }
      }
    }
    if (proofsResult.data) setProofs(proofsResult.data);
    if (timelineResult.data) setTimeline(timelineResult.data);

    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [orderId]);

  const handleReceiveOrder = async () => {
    if (!order || !profile?.id) return;

    Alert.alert(
      'Confirm Receipt',
      'Confirm that you have received this order and are ready to begin work?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            const result = await ProductionManagement.receiveOrder(order.id, profile.id);
            if (result.success) {
              fetchData();
            } else {
              Alert.alert('Error', result.error || 'Failed to confirm receipt');
            }
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleStartProduction = async () => {
    if (!order || !profile?.id) return;

    if (listing?.proofing_required) {
      const latestProof = proofs[0];
      if (!latestProof || latestProof.status !== 'approved') {
        Alert.alert(
          'Cannot Start Production',
          'Proofing is required for this service. Please submit a proof and wait for customer approval before starting production.'
        );
        return;
      }
    }

    Alert.alert(
      'Start Production',
      'Begin production on this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            setActionLoading(true);
            const result = await ProductionManagement.startProduction(order.id, profile.id);
            if (result.success) {
              fetchData();
            } else {
              Alert.alert('Error', result.error || 'Failed to start production');
            }
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleSubmitProof = () => {
    router.push(`/provider/production/${orderId}/submit-proof` as any);
  };

  const handleMarkReadyForDelivery = async () => {
    if (!order || !profile?.id) return;

    Alert.alert(
      'Mark Ready',
      'Mark this order as ready for delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            const result = await ProductionManagement.markReadyForDelivery(order.id, profile.id);
            if (result.success) {
              fetchData();
            } else {
              Alert.alert('Error', result.error || 'Failed to update status');
            }
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleMarkShipped = async () => {
    if (!order || !profile?.id) return;

    setActionLoading(true);
    const result = await ProductionManagement.markShipped(
      order.id,
      profile.id,
      trackingNumber || undefined,
      carrier || undefined
    );
    if (result.success) {
      setShowShipModal(false);
      setTrackingNumber('');
      setCarrier('');
      fetchData();
    } else {
      Alert.alert('Error', result.error || 'Failed to mark as shipped');
    }
    setActionLoading(false);
  };

  const handleOpenChat = () => {
    if (order) {
      router.push(`/chat/${order.id}` as any);
    }
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = getStatusIcon(order.status);
  const earnings = (order.escrow_amount || 0) * 0.85;
  const latestProof = proofs[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack('/provider/production')}
        >
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
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <StatusIcon size={20} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.orderTitle}>{order.title || 'Custom Order'}</Text>
          {order.description && (
            <Text style={styles.orderDescription}>{order.description}</Text>
          )}
        </View>

        <View style={styles.earningsCard}>
          <DollarSign size={24} color={colors.success} />
          <View style={styles.earningsContent}>
            <Text style={styles.earningsLabel}>Your Earnings</Text>
            <Text style={styles.earningsValue}>{formatCurrency(earnings)}</Text>
            <Text style={styles.earningsNote}>
              {order.escrow_released_at ? 'Released' : 'Pending (in escrow)'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitial}>
                {order.customer?.full_name?.charAt(0) || 'C'}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>
                {order.customer?.full_name || 'Customer'}
              </Text>
              <Text style={styles.orderDate}>
                Ordered {new Date(order.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {order.status === 'pending_order_received' && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleReceiveOrder}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <CheckCircle size={20} color={colors.white} />
                  <Text style={styles.primaryActionText}>Confirm Order Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'order_received' && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleStartProduction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Play size={20} color={colors.white} />
                  <Text style={styles.primaryActionText}>Start Production</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'in_production' && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleSubmitProof}
              disabled={actionLoading}
            >
              <Camera size={20} color={colors.white} />
              <Text style={styles.primaryActionText}>Submit Proof for Approval</Text>
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'pending_approval' && latestProof && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proof Status</Text>
            <View style={styles.proofStatusCard}>
              <Eye size={24} color={colors.warning} />
              <View style={styles.proofStatusContent}>
                <Text style={styles.proofStatusTitle}>Awaiting Customer Approval</Text>
                <Text style={styles.proofStatusText}>
                  Version {latestProof.version_number} submitted on{' '}
                  {new Date(latestProof.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            {latestProof.status === 'revision_requested' && (
              <TouchableOpacity
                style={[styles.primaryActionButton, { marginTop: spacing.md }]}
                onPress={handleSubmitProof}
              >
                <Camera size={20} color={colors.white} />
                <Text style={styles.primaryActionText}>Submit Revised Proof</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {order.status === 'ready_for_delivery' && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setShowShipModal(true)}
              disabled={actionLoading}
            >
              <Truck size={20} color={colors.white} />
              <Text style={styles.primaryActionText}>Mark as Shipped</Text>
            </TouchableOpacity>
          </View>
        )}

        {listing?.listing_type === 'CustomService' &&
          listing?.proofing_required &&
          proofs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Proofs</Text>
              {proofs.map((proof) => (
                <ProofApprovalCard
                  key={proof.id}
                  proof={{
                    id: proof.id,
                    production_order_id: proof.production_order_id,
                    version_number: proof.version_number,
                    proof_images: proof.proof_images || [],
                    design_files: proof.design_files || [],
                    provider_notes: proof.provider_notes,
                    status: proof.status,
                    created_at: proof.created_at,
                  }}
                  onAction={fetchData}
                  isCustomer={false}
                />
              ))}
            </View>
          )}

        {listing?.listing_type === 'CustomService' &&
          !listing?.proofing_required &&
          proofs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Proof History</Text>
              <View style={styles.proofingDisabledNotice}>
                <Text style={styles.proofingDisabledText}>
                  Proofing is not required for this listing. Proofs are for reference only.
                </Text>
              </View>
              {proofs.map((proof) => (
                <View key={proof.id} style={styles.proofHistoryItem}>
                  <View style={styles.proofVersion}>
                    <Text style={styles.proofVersionText}>v{proof.version_number}</Text>
                  </View>
                  <View style={styles.proofHistoryContent}>
                    <Text style={styles.proofHistoryTitle}>
                      {proof.status === 'approved'
                        ? 'Approved'
                        : proof.status === 'rejected'
                        ? 'Rejected'
                        : proof.status === 'revision_requested'
                        ? 'Revision Requested'
                        : 'Pending Review'}
                    </Text>
                    <Text style={styles.proofHistoryDate}>
                      {new Date(proof.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.proofStatusDot,
                      {
                        backgroundColor:
                          proof.status === 'approved'
                            ? colors.success
                            : proof.status === 'rejected'
                            ? colors.error
                            : proof.status === 'revision_requested'
                            ? colors.warning
                            : colors.info,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() => router.push(`/orders/${orderId}/timeline` as any)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {timeline.slice(0, 5).map((event) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDescription}>{event.description}</Text>
                <Text style={styles.timelineDate}>
                  {new Date(event.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showShipModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shipping Details</Text>
              <TouchableOpacity onPress={() => setShowShipModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tracking Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              placeholder="Enter tracking number"
              placeholderTextColor={colors.textLight}
            />

            <Text style={styles.inputLabel}>Carrier (Optional)</Text>
            <TextInput
              style={styles.input}
              value={carrier}
              onChangeText={setCarrier}
              placeholder="E.g., USPS, FedEx, UPS"
              placeholderTextColor={colors.textLight}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowShipModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleMarkShipped}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Mark Shipped</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  backButtonLarge: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  statusSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  orderTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  orderDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  earningsCard: {
    flexDirection: 'row',
    backgroundColor: colors.successLight,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  earningsContent: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
  earningsValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.successDark,
  },
  earningsNote: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginTop: 2,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionSection: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  primaryActionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  proofStatusCard: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  proofStatusContent: {
    flex: 1,
  },
  proofStatusTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warningDark,
  },
  proofStatusText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginTop: 2,
  },
  proofHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  proofVersion: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofVersionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  proofHistoryContent: {
    flex: 1,
  },
  proofHistoryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  proofHistoryDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proofStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  proofingDisabledNotice: {
    backgroundColor: colors.infoLight || '#E0F2FE',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  proofingDisabledText: {
    fontSize: fontSize.sm,
    color: colors.info || '#0284C7',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDescription: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  timelineDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomPadding: {
    height: spacing.xxxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 2,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  modalConfirmText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
