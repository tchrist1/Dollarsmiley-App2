import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';
import CustomProductsService from '@/lib/custom-products';
import { CheckCircle, XCircle, Edit3, Download } from 'lucide-react-native';

interface ProofApprovalCardProps {
  proof: {
    id: string;
    production_order_id: string;
    version_number: number;
    proof_images: string[];
    design_files: string[];
    provider_notes?: string;
    status: string;
    created_at: string;
  };
  onAction: () => void;
  isCustomer: boolean;
}

export default function ProofApprovalCard({ proof, onAction, isCustomer }: ProofApprovalCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [changeRequests, setChangeRequests] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!isCustomer) return;

    Alert.alert(
      'Approve Proof',
      'Are you sure you want to approve this proof? Production will begin after approval.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              await CustomProductsService.approveProof(proof.id, feedback);
              Alert.alert('Success', 'Proof approved successfully!');
              onAction();
            } catch (error) {
              console.error('Failed to approve proof:', error);
              Alert.alert('Error', 'Failed to approve proof');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!isCustomer) return;

    Alert.alert(
      'Reject Proof',
      'Are you sure you want to reject this proof? Please provide feedback.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            if (!feedback.trim()) {
              Alert.alert('Feedback Required', 'Please provide feedback for rejection');
              return;
            }

            setLoading(true);
            try {
              await CustomProductsService.rejectProof(proof.id, feedback);
              Alert.alert('Success', 'Proof rejected. Provider will be notified.');
              onAction();
            } catch (error) {
              console.error('Failed to reject proof:', error);
              Alert.alert('Error', 'Failed to reject proof');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRequestRevision = async () => {
    if (!isCustomer) return;

    const validRequests = changeRequests.filter((r) => r.trim() !== '');
    if (validRequests.length === 0) {
      Alert.alert('Required', 'Please add at least one change request');
      return;
    }

    if (!feedback.trim()) {
      Alert.alert('Required', 'Please provide overall feedback');
      return;
    }

    setLoading(true);
    try {
      await CustomProductsService.requestProofRevision(
        proof.id,
        validRequests.map((r, i) => ({ id: i + 1, change: r })),
        feedback
      );
      Alert.alert('Success', 'Revision requested. Provider will update the proof.');
      onAction();
    } catch (error) {
      console.error('Failed to request revision:', error);
      Alert.alert('Error', 'Failed to request revision');
    } finally {
      setLoading(false);
    }
  };

  const addChangeRequest = () => {
    setChangeRequests([...changeRequests, '']);
  };

  const updateChangeRequest = (index: number, value: string) => {
    const updated = [...changeRequests];
    updated[index] = value;
    setChangeRequests(updated);
  };

  const removeChangeRequest = (index: number) => {
    if (changeRequests.length > 1) {
      setChangeRequests(changeRequests.filter((_, i) => i !== index));
    }
  };

  const getStatusColor = () => {
    switch (proof.status) {
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      case 'revision_requested':
        return colors.warning;
      default:
        return colors.info;
    }
  };

  const getStatusText = () => {
    switch (proof.status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'revision_requested':
        return 'Revision Requested';
      default:
        return 'Pending Review';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.versionText}>Version {proof.version_number}</Text>
          <Text style={styles.dateText}>
            {new Date(proof.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      {proof.provider_notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Provider Notes:</Text>
          <Text style={styles.notesText}>{proof.provider_notes}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
        {proof.proof_images.map((imageUrl, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri: imageUrl }} style={styles.proofImage} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>

      {proof.design_files.length > 0 && (
        <View style={styles.filesSection}>
          <Text style={styles.filesLabel}>Design Files Available</Text>
          {proof.design_files.map((file, index) => (
            <TouchableOpacity key={index} style={styles.fileItem}>
              <Download size={16} color={colors.primary} />
              <Text style={styles.fileName}>Design File {index + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isCustomer && proof.status === 'pending' && (
        <>
          {!showActions ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
                disabled={loading}
              >
                <CheckCircle size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.revisionButton]}
                onPress={() => setShowActions(true)}
                disabled={loading}
              >
                <Edit3 size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Request Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={loading}
              >
                <XCircle size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>Change Requests</Text>
              {changeRequests.map((request, index) => (
                <View key={index} style={styles.changeRequestRow}>
                  <TextInput
                    style={styles.changeRequestInput}
                    value={request}
                    onChangeText={(text) => updateChangeRequest(index, text)}
                    placeholder={`Change request ${index + 1}`}
                    placeholderTextColor={colors.textLight}
                  />
                  {changeRequests.length > 1 && (
                    <TouchableOpacity onPress={() => removeChangeRequest(index)}>
                      <XCircle size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={addChangeRequest}>
                <Text style={styles.addButtonText}>+ Add Another Request</Text>
              </TouchableOpacity>

              <Text style={styles.feedbackLabel}>Overall Feedback</Text>
              <TextInput
                style={styles.feedbackInput}
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Provide detailed feedback about the changes needed"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setShowActions(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.submitButton]}
                  onPress={handleRequestRevision}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>
                    {loading ? 'Submitting...' : 'Submit Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {!isCustomer && proof.status === 'pending' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Waiting for customer approval. You'll be notified when they respond.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  versionText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  notesSection: {
    marginBottom: spacing.md,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  imagesContainer: {
    marginBottom: spacing.md,
  },
  imageWrapper: {
    marginRight: spacing.sm,
  },
  proofImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  filesSection: {
    marginBottom: spacing.md,
  },
  filesLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  fileName: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  revisionButton: {
    backgroundColor: colors.warning,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  feedbackSection: {
    marginTop: spacing.md,
  },
  feedbackLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  changeRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  changeRequestInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  addButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  infoBox: {
    padding: spacing.sm,
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});