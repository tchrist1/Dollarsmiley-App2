import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, Calendar, User } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Button } from './Button';

interface EscrowHold {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  amount: number;
  platform_fee: number;
  provider_payout: number;
  status: string;
  held_at: string;
  released_at: string | null;
  expires_at: string;
  booking: {
    service_name: string;
    status: string;
    scheduled_date: string;
  };
  provider: {
    full_name: string;
    email: string;
  };
  customer: {
    full_name: string;
    email: string;
  };
}

interface AdminPayoutsManagerProps {
  adminId: string;
}

export default function AdminPayoutsManager({ adminId }: AdminPayoutsManagerProps) {
  const [escrows, setEscrows] = useState<EscrowHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'held' | 'released' | 'disputed'>('held');
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowHold | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchEscrows();
  }, [filter]);

  const fetchEscrows = async () => {
    setLoading(true);

    let query = supabase
      .from('escrow_holds')
      .select(`
        *,
        booking:bookings!escrow_holds_booking_id_fkey(service_name, status, scheduled_date),
        provider:profiles!escrow_holds_provider_id_fkey(full_name, email),
        customer:profiles!escrow_holds_customer_id_fkey(full_name, email)
      `)
      .order('held_at', { ascending: false });

    if (filter !== 'all') {
      const statusMap = {
        held: 'Held',
        released: 'Released',
        disputed: 'Disputed',
      };
      query = query.eq('status', statusMap[filter]);
    }

    const { data, error } = await query;

    if (!error && data) {
      setEscrows(data as any);
    }

    setLoading(false);
  };

  const handleViewEscrow = (escrow: EscrowHold) => {
    setSelectedEscrow(escrow);
    setModalVisible(true);
  };

  const handleReleaseEscrow = async (escrowId: string, providerId: string, amount: number) => {
    Alert.alert(
      'Release Funds',
      `Release $${amount.toFixed(2)} to provider?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'default',
          onPress: async () => {
            setProcessing(true);

            try {
              const { error: escrowError } = await supabase
                .from('escrow_holds')
                .update({
                  status: 'Released',
                  released_at: new Date().toISOString(),
                })
                .eq('id', escrowId);

              if (escrowError) throw escrowError;

              const { error: transactionError } = await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: providerId,
                  amount: amount,
                  transaction_type: 'Payout',
                  status: 'Completed',
                  description: `Payout from escrow ${escrowId}`,
                  escrow_hold_id: escrowId,
                });

              if (transactionError) throw transactionError;

              await supabase.rpc('log_admin_action', {
                p_admin_id: adminId,
                p_action_type: 'EscrowRelease',
                p_target_type: 'Escrow',
                p_target_id: escrowId,
              });

              Alert.alert('Success', 'Funds released to provider');
              setModalVisible(false);
              fetchEscrows();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to release funds');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleForceRefund = async (escrowId: string, customerId: string, amount: number, bookingId: string) => {
    Alert.alert(
      'Force Refund',
      `Refund $${amount.toFixed(2)} to customer? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);

            try {
              const { data: refundData, error: refundError } = await supabase
                .from('refunds')
                .insert({
                  booking_id: bookingId,
                  escrow_hold_id: escrowId,
                  amount: amount,
                  reason: 'AdminInitiated',
                  status: 'Completed',
                  requested_by: customerId,
                  approved_by: adminId,
                  processed_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (refundError) throw refundError;

              const { error: escrowError } = await supabase
                .from('escrow_holds')
                .update({ status: 'Refunded' })
                .eq('id', escrowId);

              if (escrowError) throw escrowError;

              const { error: transactionError } = await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: customerId,
                  amount: amount,
                  transaction_type: 'Refund',
                  status: 'Completed',
                  description: `Refund for booking ${bookingId}`,
                  escrow_hold_id: escrowId,
                  refund_id: refundData.id,
                });

              if (transactionError) throw transactionError;

              await supabase.rpc('log_admin_action', {
                p_admin_id: adminId,
                p_action_type: 'ForceRefund',
                p_target_type: 'Escrow',
                p_target_id: escrowId,
              });

              Alert.alert('Success', 'Refund processed successfully');
              setModalVisible(false);
              fetchEscrows();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to process refund');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Held':
        return theme.colors.warning;
      case 'Released':
        return theme.colors.success;
      case 'Refunded':
        return theme.colors.error;
      case 'Disputed':
        return theme.colors.error;
      default:
        return theme.colors.textLight;
    }
  };

  const isExpiringSoon = (expiresAt: string) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const renderEscrow = ({ item }: { item: EscrowHold }) => (
    <TouchableOpacity style={styles.escrowCard} onPress={() => handleViewEscrow(item)}>
      <View style={styles.escrowHeader}>
        <View style={styles.providerInfo}>
          <User size={16} color={theme.colors.primary} />
          <Text style={styles.providerName}>{item.provider.full_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.serviceName}>{item.booking.service_name}</Text>

      <View style={styles.amountRow}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>${item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Provider</Text>
          <Text style={[styles.amountValue, { color: theme.colors.success }]}>
            ${item.provider_payout.toFixed(2)}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Platform</Text>
          <Text style={[styles.amountValue, { color: theme.colors.primary }]}>
            ${item.platform_fee.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.escrowFooter}>
        <View style={styles.dateInfo}>
          <Clock size={14} color={theme.colors.textLight} />
          <Text style={styles.dateText}>
            Held {new Date(item.held_at).toLocaleDateString()}
          </Text>
        </View>
        {item.status === 'Held' && isExpiringSoon(item.expires_at) && (
          <View style={styles.warningBadge}>
            <Text style={styles.warningText}>Expires Soon</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {(['all', 'held', 'released', 'disputed'] as const).map((f) => (
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
        <Text style={styles.loadingText}>Loading escrows...</Text>
      ) : escrows.length === 0 ? (
        <View style={styles.emptyContainer}>
          <DollarSign size={48} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>No escrows found</Text>
        </View>
      ) : (
        <FlatList
          data={escrows}
          renderItem={renderEscrow}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escrow Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <XCircle size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedEscrow && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{selectedEscrow.booking.service_name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Provider</Text>
                  <Text style={styles.detailValue}>{selectedEscrow.provider.full_name}</Text>
                  <Text style={styles.detailSubtext}>{selectedEscrow.provider.email}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{selectedEscrow.customer.full_name}</Text>
                  <Text style={styles.detailSubtext}>{selectedEscrow.customer.email}</Text>
                </View>

                <View style={styles.amountBreakdown}>
                  <Text style={styles.breakdownTitle}>Amount Breakdown</Text>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Total Amount:</Text>
                    <Text style={styles.breakdownValue}>
                      ${selectedEscrow.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Provider Payout (90%):</Text>
                    <Text style={[styles.breakdownValue, { color: theme.colors.success }]}>
                      ${selectedEscrow.provider_payout.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Platform Fee (10%):</Text>
                    <Text style={[styles.breakdownValue, { color: theme.colors.primary }]}>
                      ${selectedEscrow.platform_fee.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(selectedEscrow.status) }]}>
                    {selectedEscrow.status}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Held Since</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedEscrow.held_at).toLocaleString()}
                  </Text>
                </View>

                {selectedEscrow.status === 'Held' && (
                  <>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Expires At</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedEscrow.expires_at).toLocaleString()}
                      </Text>
                      {isExpiringSoon(selectedEscrow.expires_at) && (
                        <Text style={styles.expiryWarning}>⚠️ Expires in less than 7 days</Text>
                      )}
                    </View>

                    <View style={styles.actionButtons}>
                      <Button
                        title="Release to Provider"
                        onPress={() =>
                          handleReleaseEscrow(
                            selectedEscrow.id,
                            selectedEscrow.provider_id,
                            selectedEscrow.provider_payout
                          )
                        }
                        disabled={processing}
                      />
                      <TouchableOpacity
                        style={styles.refundButton}
                        onPress={() =>
                          handleForceRefund(
                            selectedEscrow.id,
                            selectedEscrow.customer_id,
                            selectedEscrow.amount,
                            selectedEscrow.booking_id
                          )
                        }
                        disabled={processing}
                      >
                        <Text style={styles.refundButtonText}>Force Refund</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {selectedEscrow.released_at && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Released At</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedEscrow.released_at).toLocaleString()}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingText: {
    textAlign: 'center',
    padding: 32,
    color: theme.colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textLight,
  },
  listContent: {
    padding: 16,
  },
  escrowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  escrowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  escrowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  warningBadge: {
    backgroundColor: theme.colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLight,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailSubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  amountBreakdown: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  expiryWarning: {
    fontSize: 12,
    color: theme.colors.warning,
    marginTop: 4,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
  },
  refundButton: {
    backgroundColor: theme.colors.error,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refundButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
