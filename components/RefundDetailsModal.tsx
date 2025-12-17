import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  User,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
} from 'lucide-react-native';
import {
  formatCurrency,
  getRefundStatusColor,
  formatRefundReason,
  calculateProcessingTime,
  approveRefund,
  rejectRefund,
  type AdminRefund,
} from '@/lib/admin-refund-management';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface RefundDetailsModalProps {
  visible: boolean;
  refund: AdminRefund | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RefundDetailsModal({
  visible,
  refund,
  onClose,
  onSuccess,
}: RefundDetailsModalProps) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!refund) {
    return null;
  }

  const statusColor = getRefundStatusColor(refund.status);
  const processingTime = calculateProcessingTime(refund.created_at, refund.processed_at);

  const handleApprove = async () => {
    if (!user?.id) return;

    Alert.alert(
      'Approve Refund',
      `Are you sure you want to approve this refund of ${formatCurrency(refund.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessing(true);
            const result = await approveRefund(refund.id, user.id);
            setProcessing(false);

            if (result.success) {
              Alert.alert('Success', 'Refund approved successfully');
              onSuccess?.();
              onClose();
            } else {
              Alert.alert('Error', result.error || 'Failed to approve refund');
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    if (!user?.id) return;

    setProcessing(true);
    const result = await rejectRefund(refund.id, user.id, rejectReason);
    setProcessing(false);

    if (result.success) {
      Alert.alert('Success', 'Refund rejected successfully');
      setShowRejectInput(false);
      setRejectReason('');
      onSuccess?.();
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Failed to reject refund');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Refund Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusIcon}>
                  {refund.status === 'Completed'
                    ? '✅'
                    : refund.status === 'Failed'
                    ? '❌'
                    : '⏳'}
                </Text>
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusText}>{refund.status}</Text>
                <Text style={styles.processingTime}>{processingTime}</Text>
              </View>
            </View>

            <View style={styles.amountContainer}>
              <DollarSign size={24} color={colors.success} />
              <Text style={styles.amount}>{formatCurrency(refund.amount)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Package size={18} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Booking</Text>
                  <Text style={styles.infoValue}>
                    {refund.booking?.title || 'Unknown'}
                  </Text>
                </View>
              </View>
              {refund.booking?.scheduled_date && (
                <View style={styles.infoRow}>
                  <Calendar size={18} color={colors.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Scheduled Date</Text>
                    <Text style={styles.infoValue}>
                      {new Date(refund.booking.scheduled_date).toLocaleDateString(
                        'en-US',
                        {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </Text>
                  </View>
                </View>
              )}
              {refund.booking?.price && (
                <View style={styles.infoRow}>
                  <DollarSign size={18} color={colors.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Original Amount</Text>
                    <Text style={styles.infoValue}>
                      {formatCurrency(refund.booking.price)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Refund Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <FileText size={18} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Reason</Text>
                  <Text style={styles.infoValue}>
                    {formatRefundReason(refund.reason)}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <User size={18} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Requested By</Text>
                  <Text style={styles.infoValue}>
                    {refund.requester?.full_name || 'Unknown'}
                  </Text>
                  {refund.requester?.email && (
                    <Text style={styles.infoSubtext}>{refund.requester.email}</Text>
                  )}
                </View>
              </View>
              {refund.approver && (
                <View style={styles.infoRow}>
                  <CheckCircle size={18} color={colors.success} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Approved By</Text>
                    <Text style={styles.infoValue}>{refund.approver.full_name}</Text>
                    {refund.approver.email && (
                      <Text style={styles.infoSubtext}>{refund.approver.email}</Text>
                    )}
                  </View>
                </View>
              )}
              <View style={styles.infoRow}>
                <Calendar size={18} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Requested Date</Text>
                  <Text style={styles.infoValue}>
                    {new Date(refund.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              {refund.processed_at && (
                <View style={styles.infoRow}>
                  <Calendar size={18} color={colors.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Processed Date</Text>
                    <Text style={styles.infoValue}>
                      {new Date(refund.processed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {refund.stripe_refund_id && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stripe Information</Text>
              <View style={styles.stripeCard}>
                <Text style={styles.stripeLabel}>Refund ID</Text>
                <Text style={styles.stripeId}>{refund.stripe_refund_id}</Text>
              </View>
            </View>
          )}

          {refund.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{refund.notes}</Text>
              </View>
            </View>
          )}

          {refund.dispute_id && (
            <View style={styles.section}>
              <View style={styles.disputeBanner}>
                <AlertTriangle size={20} color={colors.warning} />
                <Text style={styles.disputeText}>
                  This refund is associated with a dispute
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {refund.status === 'Pending' && !processing && (
          <View style={styles.footer}>
            {showRejectInput ? (
              <View style={styles.rejectInputContainer}>
                <TextInput
                  style={styles.rejectInput}
                  placeholder="Enter reason for rejection..."
                  placeholderTextColor={colors.textSecondary}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <View style={styles.rejectActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowRejectInput(false);
                      setRejectReason('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmRejectButton}
                    onPress={handleReject}
                  >
                    <XCircle size={18} color={colors.white} />
                    <Text style={styles.confirmRejectText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectButtonAction}
                  onPress={() => setShowRejectInput(true)}
                >
                  <XCircle size={20} color={colors.white} />
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveButtonAction}
                  onPress={handleApprove}
                >
                  <CheckCircle size={20} color={colors.white} />
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {processing && (
          <View style={styles.footer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 24,
  },
  statusInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  processingTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '15',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
  },
  amount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  infoSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  stripeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  stripeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  stripeId: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  notesCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  disputeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  disputeText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  approveButtonAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
  },
  rejectButtonAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
  },
  actionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  rejectInputContainer: {
    gap: spacing.md,
  },
  rejectInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rejectActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  confirmRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  confirmRejectText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  processingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
