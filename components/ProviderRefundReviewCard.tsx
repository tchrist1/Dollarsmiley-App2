import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency-utils';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  MessageCircle,
  User,
  Calendar,
} from 'lucide-react-native';

interface RefundRequest {
  id: string;
  production_order_id: string;
  customer_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  created_at: string;
  resolved_at?: string;
  provider_response?: string;
  customer?: {
    full_name: string;
  };
  production_order?: {
    title: string;
    escrow_amount: number;
  };
}

interface ProviderRefundReviewCardProps {
  refund: RefundRequest;
  onActionComplete: () => void;
}

export default function ProviderRefundReviewCard({
  refund,
  onActionComplete,
}: ProviderRefundReviewCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    if (!response.trim()) {
      Alert.alert('Response Required', 'Please provide a response to the customer.');
      return;
    }

    Alert.alert(
      'Approve Refund',
      `Are you sure you want to approve this refund of ${formatCurrency(refund.amount)}? The amount will be refunded to the customer from escrow.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setLoading(true);

            try {
              const { error: updateError } = await supabase
                .from('refund_requests')
                .update({
                  status: 'approved',
                  provider_response: response,
                  resolved_at: new Date().toISOString(),
                })
                .eq('id', refund.id);

              if (updateError) throw updateError;

              const refundResponse = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/refund-custom-service-escrow`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    productionOrderId: refund.production_order_id,
                    refundAmount: refund.amount,
                    reason: 'provider_approved_refund',
                  }),
                }
              );

              if (!refundResponse.ok) {
                const errorData = await refundResponse.json();
                throw new Error(errorData.error || 'Failed to process refund');
              }

              await supabase.from('production_timeline_events').insert({
                production_order_id: refund.production_order_id,
                event_type: 'refund_approved',
                description: `Refund of ${formatCurrency(refund.amount)} approved by provider`,
                actor_id: refund.customer_id,
                metadata: {
                  refund_id: refund.id,
                  amount: refund.amount,
                },
              });

              Alert.alert('Refund Approved', 'The refund has been approved and is being processed.');
              onActionComplete();
            } catch (error: any) {
              console.error('Approve refund error:', error);
              Alert.alert('Error', error.message || 'Failed to approve refund');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!response.trim()) {
      Alert.alert('Response Required', 'Please provide a reason for rejecting the refund.');
      return;
    }

    Alert.alert(
      'Reject Refund',
      'Are you sure you want to reject this refund request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              const { error } = await supabase
                .from('refund_requests')
                .update({
                  status: 'rejected',
                  provider_response: response,
                  resolved_at: new Date().toISOString(),
                })
                .eq('id', refund.id);

              if (error) throw error;

              await supabase.from('production_timeline_events').insert({
                production_order_id: refund.production_order_id,
                event_type: 'refund_rejected',
                description: 'Refund request rejected by provider',
                actor_id: refund.customer_id,
                metadata: {
                  refund_id: refund.id,
                  reason: response,
                },
              });

              Alert.alert('Refund Rejected', 'The customer has been notified of the rejection.');
              onActionComplete();
            } catch (error: any) {
              console.error('Reject refund error:', error);
              Alert.alert('Error', error.message || 'Failed to reject refund');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = () => {
    switch (refund.status) {
      case 'pending':
        return { color: colors.warning, icon: Clock, label: 'Pending Review' };
      case 'approved':
        return { color: colors.success, icon: CheckCircle, label: 'Approved' };
      case 'rejected':
        return { color: colors.error, icon: XCircle, label: 'Rejected' };
      case 'processing':
        return { color: colors.info, icon: Clock, label: 'Processing' };
      case 'completed':
        return { color: colors.success, icon: CheckCircle, label: 'Completed' };
      default:
        return { color: colors.textSecondary, icon: AlertCircle, label: refund.status };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;
  const refundPercentage = refund.production_order?.escrow_amount
    ? Math.round((refund.amount / refund.production_order.escrow_amount) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
          <StatusIcon size={16} color={statusBadge.color} />
          <Text style={[styles.statusText, { color: statusBadge.color }]}>
            {statusBadge.label}
          </Text>
        </View>
        <Text style={styles.date}>
          {new Date(refund.created_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.orderTitle}>
        {refund.production_order?.title || 'Custom Order'}
      </Text>

      <View style={styles.amountSection}>
        <DollarSign size={24} color={colors.error} />
        <View style={styles.amountContent}>
          <Text style={styles.amountLabel}>Requested Refund</Text>
          <Text style={styles.amountValue}>{formatCurrency(refund.amount)}</Text>
          <Text style={styles.amountPercentage}>
            {refundPercentage}% of order value
          </Text>
        </View>
      </View>

      <View style={styles.customerSection}>
        <User size={18} color={colors.textSecondary} />
        <Text style={styles.customerName}>
          {refund.customer?.full_name || 'Customer'}
        </Text>
      </View>

      <View style={styles.reasonSection}>
        <Text style={styles.reasonLabel}>Reason for Refund</Text>
        <Text style={styles.reasonText}>{refund.reason}</Text>
      </View>

      {refund.status === 'pending' && (
        <>
          {!showActions ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => setShowActions(true)}
              >
                <MessageCircle size={18} color={colors.primary} />
                <Text style={styles.reviewButtonText}>Review & Respond</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.responseForm}>
              <Text style={styles.responseLabel}>Your Response</Text>
              <TextInput
                style={styles.responseInput}
                value={response}
                onChangeText={setResponse}
                placeholder={
                  actionType === 'approve'
                    ? 'Add a message for the customer...'
                    : actionType === 'reject'
                    ? 'Explain why you are rejecting this request...'
                    : 'Enter your response to the customer...'
                }
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowActions(false);
                    setResponse('');
                    setActionType(null);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rejectButton, loading && styles.buttonDisabled]}
                  onPress={() => {
                    setActionType('reject');
                    handleReject();
                  }}
                  disabled={loading}
                >
                  {loading && actionType === 'reject' ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <XCircle size={16} color={colors.white} />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approveButton, loading && styles.buttonDisabled]}
                  onPress={() => {
                    setActionType('approve');
                    handleApprove();
                  }}
                  disabled={loading}
                >
                  {loading && actionType === 'approve' ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <CheckCircle size={16} color={colors.white} />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {refund.status !== 'pending' && refund.provider_response && (
        <View style={styles.responseSection}>
          <Text style={styles.responseLabel}>Your Response</Text>
          <Text style={styles.responseText}>{refund.provider_response}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  orderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  amountSection: {
    flexDirection: 'row',
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  amountContent: {
    flex: 1,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  amountValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.errorDark,
  },
  amountPercentage: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: 2,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customerName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  reasonSection: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  reasonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.md,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  reviewButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  responseForm: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  responseLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  responseInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  rejectButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  approveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  responseSection: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  responseText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
});
