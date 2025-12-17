import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, Eye, DollarSign, Calendar } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Button } from './Button';

interface Dispute {
  id: string;
  booking_id: string;
  escrow_hold_id: string;
  filed_by: string;
  filed_against: string;
  dispute_type: string;
  description: string;
  status: string;
  created_at: string;
  booking: {
    service_name: string;
    total_price: number;
  };
  filer: {
    full_name: string;
    email: string;
  };
  defendant: {
    full_name: string;
    email: string;
  };
  escrow_hold: {
    amount: number;
    platform_fee: number;
    provider_payout: number;
  };
}

interface AdminDisputesManagerProps {
  adminId: string;
}

export default function AdminDisputesManager({ adminId }: AdminDisputesManagerProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'underreview' | 'resolved' | 'urgent'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [resolution, setResolution] = useState('');
  const [resolutionType, setResolutionType] = useState('NoRefund');
  const [refundAmount, setRefundAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    setLoading(true);

    let query = supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings!disputes_booking_id_fkey(service_name, total_price),
        filer:profiles!disputes_filed_by_fkey(full_name, email),
        defendant:profiles!disputes_filed_against_fkey(full_name, email),
        escrow_hold:escrow_holds!disputes_escrow_hold_id_fkey(amount, platform_fee, provider_payout)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      if (filter === 'urgent') {
        query = query.eq('priority', 'Urgent');
      } else {
        const statusMap = {
          open: 'Open',
          underreview: 'UnderReview',
          resolved: 'Resolved',
        };
        query = query.eq('status', statusMap[filter]);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      setDisputes(data as any);
    }

    setLoading(false);
  };

  const handleViewDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setModalVisible(true);
    setResolution('');
    setRefundAmount('');
  };

  const handleUpdateStatus = async (disputeId: string, newStatus: string) => {
    const { error } = await supabase
      .from('disputes')
      .update({ status: newStatus })
      .eq('id', disputeId);

    if (!error) {
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'DisputeStatusUpdate',
        p_target_type: 'Dispute',
        p_target_id: disputeId,
      });

      fetchDisputes();
      Alert.alert('Success', `Dispute status updated to ${newStatus}`);
    } else {
      Alert.alert('Error', 'Failed to update dispute status');
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolution.trim()) {
      Alert.alert('Error', 'Please provide a resolution description');
      return;
    }

    setResolving(true);

    const refundValue = refundAmount ? parseFloat(refundAmount) : 0;

    if (refundValue > selectedDispute.escrow_hold.amount) {
      Alert.alert('Error', 'Refund amount cannot exceed escrow amount');
      setResolving(false);
      return;
    }

    const actualResolutionType = refundValue > 0
      ? (refundValue >= selectedDispute.escrow_hold.amount ? 'FullRefund' : 'PartialRefund')
      : resolutionType;

    try {
      const { error: disputeError } = await supabase
        .from('disputes')
        .update({
          status: 'Resolved',
          resolution: resolution.trim(),
          resolution_type: actualResolutionType,
          refund_amount: refundValue,
          admin_notes: adminNotes.trim() || null,
          resolved_by: adminId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', selectedDispute.id);

      if (disputeError) throw disputeError;

      if (refundValue > 0) {
        const { error: refundError } = await supabase.from('refunds').insert({
          booking_id: selectedDispute.booking_id,
          escrow_hold_id: selectedDispute.escrow_hold_id,
          dispute_id: selectedDispute.id,
          amount: refundValue,
          reason: 'Disputed',
          status: 'Pending',
          requested_by: selectedDispute.filed_by,
          approved_by: adminId,
          notes: `Dispute resolved: ${actualResolutionType}`,
        });

        if (refundError) throw refundError;

        const { error: escrowError } = await supabase
          .from('escrow_holds')
          .update({ status: 'Refunded' })
          .eq('id', selectedDispute.escrow_hold_id);

        if (escrowError) throw escrowError;

        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'Cancelled', refund_requested: true })
          .eq('id', selectedDispute.booking_id);

        if (bookingError) throw bookingError;
      } else {
        const { error: escrowError } = await supabase
          .from('escrow_holds')
          .update({ status: 'Released' })
          .eq('id', selectedDispute.escrow_hold_id);

        if (escrowError) throw escrowError;

        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'Completed' })
          .eq('id', selectedDispute.booking_id);

        if (bookingError) throw bookingError;
      }

      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'DisputeResolved',
        p_target_type: 'Dispute',
        p_target_id: selectedDispute.id,
      });

      Alert.alert('Success', 'Dispute resolved successfully. Both parties have been notified.');
      setModalVisible(false);
      setResolution('');
      setRefundAmount('');
      setAdminNotes('');
      setResolutionType('NoRefund');
      fetchDisputes();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return theme.colors.error;
      case 'UnderReview':
        return theme.colors.warning;
      case 'Resolved':
        return theme.colors.success;
      default:
        return theme.colors.textLight;
    }
  };

  const renderDispute = ({ item }: { item: Dispute }) => (
    <TouchableOpacity style={styles.disputeCard} onPress={() => handleViewDispute(item)}>
      <View style={styles.disputeHeader}>
        <View style={styles.disputeTypeContainer}>
          <AlertTriangle size={20} color={getStatusColor(item.status)} />
          <Text style={styles.disputeType}>{item.dispute_type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.serviceName}>{item.booking.service_name}</Text>
      <Text style={styles.disputeDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.disputeFooter}>
        <View style={styles.party}>
          <Text style={styles.partyLabel}>Filed by:</Text>
          <Text style={styles.partyName}>{item.filer.full_name}</Text>
        </View>
        <View style={styles.party}>
          <Text style={styles.partyLabel}>Against:</Text>
          <Text style={styles.partyName}>{item.defendant.full_name}</Text>
        </View>
      </View>

      <View style={styles.disputeMeta}>
        <View style={styles.metaItem}>
          <DollarSign size={14} color={theme.colors.textLight} />
          <Text style={styles.metaText}>${item.escrow_hold.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Calendar size={14} color={theme.colors.textLight} />
          <Text style={styles.metaText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {(['all', 'urgent', 'open', 'underreview', 'resolved'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' :
               f === 'urgent' ? '🔥 Urgent' :
               f === 'open' ? 'Open' :
               f === 'underreview' ? 'Under Review' :
               'Resolved'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <Text style={styles.loadingText}>Loading disputes...</Text>
      ) : disputes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertTriangle size={48} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>No disputes found</Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          renderItem={renderDispute}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispute Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedDispute && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{selectedDispute.booking.service_name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Dispute Type</Text>
                  <Text style={styles.detailValue}>{selectedDispute.dispute_type}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailDescription}>{selectedDispute.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Filed By</Text>
                  <Text style={styles.detailValue}>{selectedDispute.filer.full_name}</Text>
                  <Text style={styles.detailSubtext}>{selectedDispute.filer.email}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Filed Against</Text>
                  <Text style={styles.detailValue}>{selectedDispute.defendant.full_name}</Text>
                  <Text style={styles.detailSubtext}>{selectedDispute.defendant.email}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Escrow Amount</Text>
                  <Text style={styles.detailValue}>
                    ${selectedDispute.escrow_hold.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.detailSubtext}>
                    Provider: ${selectedDispute.escrow_hold.provider_payout.toFixed(2)} |
                    Platform: ${selectedDispute.escrow_hold.platform_fee.toFixed(2)}
                  </Text>
                </View>

                {selectedDispute.status !== 'Resolved' && (
                  <>
                    <View style={styles.actionSection}>
                      <Text style={styles.actionLabel}>Update Status</Text>
                      <View style={styles.statusButtons}>
                        {selectedDispute.status !== 'UnderReview' && (
                          <TouchableOpacity
                            style={[styles.statusButton, styles.reviewButton]}
                            onPress={() => handleUpdateStatus(selectedDispute.id, 'UnderReview')}
                          >
                            <Eye size={16} color="#fff" />
                            <Text style={styles.statusButtonText}>Under Review</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.resolutionSection}>
                      <Text style={styles.resolutionLabel}>Resolve Dispute</Text>

                      <Text style={styles.fieldLabel}>Resolution Type</Text>
                      <View style={styles.resolutionTypeContainer}>
                        {['NoRefund', 'PartialRefund', 'FullRefund', 'ServiceRedo'].map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.resolutionTypeButton,
                              resolutionType === type && styles.resolutionTypeButtonActive,
                            ]}
                            onPress={() => setResolutionType(type)}
                          >
                            <Text
                              style={[
                                styles.resolutionTypeText,
                                resolutionType === type && styles.resolutionTypeTextActive,
                              ]}
                            >
                              {type.replace(/([A-Z])/g, ' $1').trim()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.fieldLabel}>Public Resolution</Text>
                      <TextInput
                        style={styles.resolutionInput}
                        placeholder="Resolution description (visible to both parties)..."
                        placeholderTextColor={theme.colors.textLight}
                        value={resolution}
                        onChangeText={setResolution}
                        multiline
                        numberOfLines={4}
                      />

                      {(resolutionType === 'PartialRefund' || resolutionType === 'FullRefund') && (
                        <>
                          <Text style={styles.fieldLabel}>Refund Amount</Text>
                          <TextInput
                            style={styles.refundInput}
                            placeholder={resolutionType === 'FullRefund'
                              ? `Full amount: $${selectedDispute.escrow_hold.amount.toFixed(2)}`
                              : 'Enter partial refund amount'}
                            placeholderTextColor={theme.colors.textLight}
                            value={refundAmount}
                            onChangeText={setRefundAmount}
                            keyboardType="decimal-pad"
                          />
                          <Text style={styles.refundHint}>
                            Maximum refund: ${selectedDispute.escrow_hold.amount.toFixed(2)}
                          </Text>
                        </>
                      )}

                      <Text style={styles.fieldLabel}>Admin Notes (Internal Only)</Text>
                      <TextInput
                        style={styles.adminNotesInput}
                        placeholder="Internal notes (not visible to users)..."
                        placeholderTextColor={theme.colors.textLight}
                        value={adminNotes}
                        onChangeText={setAdminNotes}
                        multiline
                        numberOfLines={3}
                      />

                      <Button
                        title={resolving ? 'Resolving...' : 'Resolve Dispute'}
                        onPress={handleResolveDispute}
                        disabled={resolving}
                      />
                    </View>
                  </>
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
  disputeCard: {
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
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  disputeTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disputeType: {
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
    marginBottom: 8,
  },
  disputeDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  party: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  disputeMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textLight,
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
  detailDescription: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  actionSection: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reviewButton: {
    backgroundColor: theme.colors.warning,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  resolutionSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  resolutionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  resolutionInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  refundInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 8,
  },
  refundHint: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  resolutionTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  resolutionTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  resolutionTypeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  resolutionTypeText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  resolutionTypeTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  adminNotesInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
});
