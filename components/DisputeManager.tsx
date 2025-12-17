import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, X, Upload, FileText, Camera } from 'lucide-react-native';
import { Button } from './Button';

interface DisputeManagerProps {
  bookingId: string;
  userId: string;
  onDisputeFiled?: () => void;
}

interface Dispute {
  id: string;
  booking_id: string;
  dispute_type: string;
  description: string;
  status: string;
  resolution: string;
  refund_amount: number;
  created_at: string;
  resolved_at: string;
  priority: string;
}

export default function DisputeManager({ bookingId, userId, onDisputeFiled }: DisputeManagerProps) {
  const [showFileModal, setShowFileModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [existingDispute, setExistingDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [disputeType, setDisputeType] = useState('Quality');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  const disputeTypes = [
    { value: 'Quality', label: 'Service Quality Issue' },
    { value: 'NoShow', label: 'Provider No-Show' },
    { value: 'Cancellation', label: 'Improper Cancellation' },
    { value: 'Payment', label: 'Payment Issue' },
    { value: 'Other', label: 'Other Issue' },
  ];

  useEffect(() => {
    checkExistingDispute();
  }, [bookingId]);

  const checkExistingDispute = async () => {
    setChecking(true);
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('filed_by', userId)
      .single();

    if (data && !error) {
      setExistingDispute(data);
    }

    setChecking(false);
  };

  const handleFileDispute = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of the issue');
      return;
    }

    setLoading(true);

    const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/handle-dispute`;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'file',
          bookingId,
          disputeType,
          description: description.trim(),
          evidenceUrls,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to file dispute');
      }

      Alert.alert(
        'Dispute Filed',
        'Your dispute has been submitted. Our admin team will review it within 48 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowFileModal(false);
              setDescription('');
              setEvidenceUrls([]);
              checkExistingDispute();
              onDisputeFiled?.();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to file dispute');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return theme.colors.warning;
      case 'UnderReview':
      case 'InvestigationRequired':
      case 'PendingResolution':
        return theme.colors.info;
      case 'Resolved':
        return theme.colors.success;
      case 'Closed':
        return theme.colors.textLight;
      case 'Appealed':
        return theme.colors.error;
      default:
        return theme.colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Open':
        return 'Open - Awaiting Review';
      case 'UnderReview':
        return 'Under Admin Review';
      case 'InvestigationRequired':
        return 'Investigation in Progress';
      case 'PendingResolution':
        return 'Resolution Pending';
      case 'Resolved':
        return 'Resolved';
      case 'Closed':
        return 'Closed';
      case 'Appealed':
        return 'Appealed';
      default:
        return status;
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return theme.colors.error;
      case 'High':
        return theme.colors.warning;
      case 'Medium':
        return theme.colors.info;
      case 'Low':
        return theme.colors.textLight;
      default:
        return theme.colors.textLight;
    }
  };

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (existingDispute) {
    return (
      <View style={styles.existingDisputeContainer}>
        <View style={styles.existingHeader}>
          <AlertTriangle size={20} color={getStatusColor(existingDispute.status)} />
          <Text style={styles.existingTitle}>Active Dispute</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(existingDispute.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(existingDispute.status) }]}>
            {getStatusText(existingDispute.status)}
          </Text>
        </View>

        {existingDispute.priority && (
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityBadgeColor(existingDispute.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityBadgeColor(existingDispute.priority) }]}>
              {existingDispute.priority} Priority
            </Text>
          </View>
        )}

        <Text style={styles.existingType}>{existingDispute.dispute_type} Issue</Text>
        <Text style={styles.existingDescription} numberOfLines={3}>
          {existingDispute.description}
        </Text>

        <TouchableOpacity style={styles.viewButton} onPress={() => setShowViewModal(true)}>
          <FileText size={16} color={theme.colors.primary} />
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>

        <Modal visible={showViewModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Dispute Details</Text>
                <TouchableOpacity onPress={() => setShowViewModal(false)}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(existingDispute.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(existingDispute.status) }]}>
                      {getStatusText(existingDispute.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Issue Type</Text>
                  <Text style={styles.detailValue}>{existingDispute.dispute_type}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailDescription}>{existingDispute.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Filed On</Text>
                  <Text style={styles.detailValue}>
                    {new Date(existingDispute.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {existingDispute.status === 'Resolved' && existingDispute.resolution && (
                  <>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Resolution</Text>
                      <Text style={styles.detailDescription}>{existingDispute.resolution}</Text>
                    </View>

                    {existingDispute.refund_amount > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Refund Amount</Text>
                        <Text style={styles.detailValue}>${existingDispute.refund_amount.toFixed(2)}</Text>
                      </View>
                    )}

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Resolved On</Text>
                      <Text style={styles.detailValue}>
                        {new Date(existingDispute.resolved_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </>
                )}

                {existingDispute.status === 'Open' && (
                  <View style={styles.infoBox}>
                    <AlertTriangle size={16} color={theme.colors.info} />
                    <Text style={styles.infoText}>
                      Your dispute is awaiting review. Our admin team will respond within 48 hours.
                    </Text>
                  </View>
                )}

                {existingDispute.status === 'UnderReview' && (
                  <View style={styles.infoBox}>
                    <AlertTriangle size={16} color={theme.colors.info} />
                    <Text style={styles.infoText}>
                      Your dispute is currently under review. You'll be notified of any updates.
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button title="Close" onPress={() => setShowViewModal(false)} variant="outline" />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button
        title="File a Dispute"
        onPress={() => setShowFileModal(true)}
        variant="outline"
        leftIcon={<AlertTriangle size={20} color={theme.colors.error} />}
      />

      <Modal visible={showFileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>File a Dispute</Text>
              <TouchableOpacity onPress={() => setShowFileModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Issue Type</Text>
              <View style={styles.typeContainer}>
                {disputeTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      disputeType === type.value && styles.typeButtonActive,
                    ]}
                    onPress={() => setDisputeType(type.value)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        disputeType === type.value && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Description</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the issue in detail..."
                placeholderTextColor={theme.colors.textLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <View style={styles.infoBox}>
                <AlertTriangle size={16} color={theme.colors.info} />
                <Text style={styles.infoText}>
                  Please provide as much detail as possible. Our admin team will review your dispute within 48 hours.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowFileModal(false);
                  setDescription('');
                }}
                variant="outline"
                style={styles.footerButton}
              />
              <Button
                title={loading ? 'Filing...' : 'File Dispute'}
                onPress={handleFileDispute}
                disabled={loading || !description.trim()}
                style={styles.footerButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  existingDisputeContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  existingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  existingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  existingType: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  existingDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  typeContainer: {
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  typeButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 120,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.info + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.info + '30',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerButton: {
    flex: 1,
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
  detailDescription: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
});
