import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Clock,
  AlertCircle,
  Eye,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface VerificationRequest {
  id: string;
  provider_id: string;
  verification_type: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  provider: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    user_type: string;
  };
  documents: {
    id: string;
    document_type: string;
    document_url: string;
    status: string;
    notes?: string;
  }[];
}

export default function AdminVerificationScreen() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [filter, setFilter] = useState<'Pending' | 'UnderReview' | 'All'>('Pending');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (profile?.user_type === 'Admin') {
      fetchRequests();
    }
  }, [profile, filter]);

  const fetchRequests = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('provider_verification_requests')
        .select(`
          *,
          provider:profiles!provider_verification_requests_provider_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            user_type
          ),
          documents:verification_documents(
            id,
            document_type,
            document_url,
            status,
            notes
          )
        `)
        .order('submitted_at', { ascending: false });

      if (filter !== 'All') {
        query = query.eq('status', filter);
      } else {
        query = query.in('status', ['Pending', 'UnderReview']);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      Alert.alert('Error', 'Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setRejectionReason(request.rejection_reason || '');
    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    Alert.alert(
      'Approve Verification',
      `Are you sure you want to approve verification for ${selectedRequest.provider.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessing(true);

            try {
              const { error: requestError } = await supabase
                .from('provider_verification_requests')
                .update({
                  status: 'Approved',
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: profile?.id,
                  admin_notes: adminNotes || null,
                })
                .eq('id', selectedRequest.id);

              if (requestError) throw requestError;

              const { error: docsError } = await supabase
                .from('verification_documents')
                .update({ status: 'Approved' })
                .eq('request_id', selectedRequest.id);

              if (docsError) throw docsError;

              Alert.alert('Success', 'Verification approved successfully');
              setShowReviewModal(false);
              fetchRequests();
            } catch (error) {
              Alert.alert('Error', 'Failed to approve verification');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason');
      return;
    }

    Alert.alert(
      'Reject Verification',
      `Are you sure you want to reject verification for ${selectedRequest.provider.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);

            try {
              const { error: requestError } = await supabase
                .from('provider_verification_requests')
                .update({
                  status: 'Rejected',
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: profile?.id,
                  rejection_reason: rejectionReason,
                  admin_notes: adminNotes || null,
                })
                .eq('id', selectedRequest.id);

              if (requestError) throw requestError;

              const { error: docsError } = await supabase
                .from('verification_documents')
                .update({ status: 'Rejected' })
                .eq('request_id', selectedRequest.id);

              if (docsError) throw docsError;

              Alert.alert('Success', 'Verification rejected');
              setShowReviewModal(false);
              fetchRequests();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject verification');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkUnderReview = async () => {
    if (!selectedRequest) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from('provider_verification_requests')
        .update({
          status: 'UnderReview',
          admin_notes: adminNotes || null,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      Alert.alert('Success', 'Marked as under review');
      setShowReviewModal(false);
      fetchRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return colors.warning;
      case 'UnderReview':
        return colors.primary;
      case 'Approved':
        return colors.success;
      case 'Rejected':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderRequestCard = (request: VerificationRequest) => {
    return (
      <TouchableOpacity
        key={request.id}
        style={styles.requestCard}
        onPress={() => handleReview(request)}
      >
        <View style={styles.requestHeader}>
          <View style={styles.providerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {request.provider.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.providerDetails}>
              <Text style={styles.providerName}>{request.provider.full_name}</Text>
              <Text style={styles.providerEmail}>{request.provider.email}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(request.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
              {request.status}
            </Text>
          </View>
        </View>

        <View style={styles.requestMeta}>
          <View style={styles.metaItem}>
            <FileText size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {request.documents?.length || 0} documents
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {new Date(request.submitted_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.typeTag}>
          <Text style={styles.typeTagText}>{request.verification_type}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReviewModal = () => {
    if (!selectedRequest) return null;

    return (
      <Modal
        visible={showReviewModal}
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowReviewModal(false)}
              style={styles.modalBackButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Review Verification</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.providerSection}>
              <Text style={styles.sectionTitle}>Provider Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{selectedRequest.provider.full_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{selectedRequest.provider.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>{selectedRequest.provider.user_type}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Submitted</Text>
                <Text style={styles.infoValue}>
                  {new Date(selectedRequest.submitted_at).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.documentsSection}>
              <Text style={styles.sectionTitle}>
                Documents ({selectedRequest.documents?.length || 0})
              </Text>
              {selectedRequest.documents?.map((doc) => (
                <View key={doc.id} style={styles.documentCard}>
                  <View style={styles.documentHeader}>
                    <FileText size={20} color={colors.primary} />
                    <Text style={styles.documentType}>{doc.document_type}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => {
                      Alert.alert(
                        'Document URL',
                        doc.document_url,
                        [
                          { text: 'OK', style: 'cancel' },
                          {
                            text: 'Open',
                            onPress: () => {
                              console.log('Open document:', doc.document_url);
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Eye size={16} color={colors.primary} />
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Admin Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add internal notes..."
                placeholderTextColor={colors.textLight}
                value={adminNotes}
                onChangeText={setAdminNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Rejection Reason (if rejecting)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Provide reason for rejection..."
                placeholderTextColor={colors.textLight}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.actionsSection}>
              {selectedRequest.status === 'Pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reviewButton]}
                  onPress={handleMarkUnderReview}
                  disabled={processing}
                >
                  <Clock size={20} color={colors.white} />
                  <Text style={styles.actionButtonText}>Mark Under Review</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <CheckCircle size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <XCircle size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (profile?.user_type !== 'Admin') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Management</Text>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={styles.errorText}>Admin access required</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Management</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'Pending' && styles.filterButtonActive]}
          onPress={() => setFilter('Pending')}
        >
          <Text
            style={[styles.filterText, filter === 'Pending' && styles.filterTextActive]}
          >
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'UnderReview' && styles.filterButtonActive]}
          onPress={() => setFilter('UnderReview')}
        >
          <Text
            style={[styles.filterText, filter === 'UnderReview' && styles.filterTextActive]}
          >
            Under Review
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'All' && styles.filterButtonActive]}
          onPress={() => setFilter('All')}
        >
          <Text style={[styles.filterText, filter === 'All' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Shield size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>No verification requests</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {requests.map((request) => renderRequestCard(request))}
        </ScrollView>
      )}

      {renderReviewModal()}
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
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  providerEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  requestMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  typeTagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalBackButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
  },
  providerSection: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  documentsSection: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  documentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  documentType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  viewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  notesSection: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionsSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  reviewButton: {
    backgroundColor: colors.primary,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
