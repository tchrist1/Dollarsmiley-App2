import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Info,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { DocumentUpload } from '@/components/DocumentUpload';
import {
  getRejectedRequestDetails,
  getRejectionReasonSuggestions,
  getRequiredDocuments,
  getDocumentTypeLabel,
  submitResubmission,
  canResubmit,
  type RejectedRequest,
} from '@/lib/document-resubmission';

interface DocumentResubmissionFlowProps {
  requestId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface UploadedDocument {
  document_type: string;
  document_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

export function DocumentResubmissionFlow({
  requestId,
  onSuccess,
  onCancel,
}: DocumentResubmissionFlowProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<RejectedRequest | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [currentDocType, setCurrentDocType] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  useEffect(() => {
    checkCanResubmit();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const data = await getRejectedRequestDetails(requestId);

      if (!data) {
        Alert.alert('Error', 'Request not found');
        onCancel();
        return;
      }

      setRequest(data);

      const suggestionsList = getRejectionReasonSuggestions(data.rejection_reason);
      setSuggestions(suggestionsList);

      const required = getRequiredDocuments(data.verification_type);
      setRequiredDocs(required);
    } catch (error) {
      console.error('Error loading request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const checkCanResubmit = async () => {
    const result = await canResubmit(requestId);
    setCanSubmit(result.canResubmit);

    if (!result.canResubmit && result.reason) {
      Alert.alert('Cannot Resubmit', result.reason, [
        { text: 'OK', onPress: onCancel },
      ]);
    }
  };

  const handleDocumentUpload = (documentType: string, url: string, metadata: any) => {
    const newDoc: UploadedDocument = {
      document_type: documentType,
      document_url: url,
      file_name: metadata.fileName,
      file_size: metadata.fileSize,
      mime_type: metadata.mimeType,
    };

    setUploadedDocuments((prev) => {
      const filtered = prev.filter((d) => d.document_type !== documentType);
      return [...filtered, newDoc];
    });

    setCurrentDocType(null);
  };

  const handleRemoveDocument = (documentType: string) => {
    setUploadedDocuments((prev) => prev.filter((d) => d.document_type !== documentType));
  };

  const handleSubmit = async () => {
    if (uploadedDocuments.length === 0) {
      Alert.alert('Error', 'Please upload at least one document');
      return;
    }

    const missingDocs = requiredDocs.filter(
      (docType) => !uploadedDocuments.some((d) => d.document_type === docType)
    );

    if (missingDocs.length > 0) {
      Alert.alert(
        'Missing Documents',
        `Please upload all required documents:\n${missingDocs.map(getDocumentTypeLabel).join('\n')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: confirmSubmit },
        ]
      );
      return;
    }

    confirmSubmit();
  };

  const confirmSubmit = async () => {
    try {
      setSubmitting(true);

      const result = await submitResubmission({
        requestId,
        newDocuments: uploadedDocuments,
      });

      if (result.success) {
        Alert.alert(
          'Resubmission Successful',
          'Your documents have been resubmitted for review. You will be notified once the review is complete.',
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit resubmission');
      }
    } catch (error) {
      console.error('Error submitting resubmission:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (!request || !canSubmit) {
    return null;
  }

  const isDocumentUploaded = (docType: string) =>
    uploadedDocuments.some((d) => d.document_type === docType);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Resubmit Verification</Text>
          <Text style={styles.headerSubtitle}>{request.verification_type}</Text>
        </View>
      </View>

      {/* Rejection Reason */}
      {request.rejection_reason && (
        <View style={styles.rejectionSection}>
          <View style={styles.rejectionHeader}>
            <AlertTriangle size={24} color={colors.error} />
            <Text style={styles.rejectionTitle}>Why was it rejected?</Text>
          </View>
          <Text style={styles.rejectionText}>{request.rejection_reason}</Text>
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <View style={styles.suggestionsHeader}>
            <Info size={20} color={colors.primary} />
            <Text style={styles.suggestionsTitle}>How to improve your submission</Text>
          </View>
          {suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Required Documents */}
      <View style={styles.documentsSection}>
        <Text style={styles.sectionTitle}>Upload New Documents</Text>
        <Text style={styles.sectionSubtitle}>
          Please upload clear, complete, and current documents
        </Text>

        {requiredDocs.map((docType) => (
          <View key={docType} style={styles.documentItem}>
            <View style={styles.documentHeader}>
              <View style={styles.documentInfo}>
                <FileText size={20} color={colors.primary} />
                <View style={styles.documentLabels}>
                  <Text style={styles.documentName}>{getDocumentTypeLabel(docType)}</Text>
                  <Text style={styles.documentRequired}>Required</Text>
                </View>
              </View>

              {isDocumentUploaded(docType) ? (
                <View style={styles.uploadedBadge}>
                  <CheckCircle size={16} color={colors.success} />
                  <Text style={styles.uploadedText}>Uploaded</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => setCurrentDocType(docType)}
                >
                  <Upload size={16} color={colors.primary} />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>

            {isDocumentUploaded(docType) && (
              <View style={styles.uploadedInfo}>
                <Text style={styles.uploadedFileName}>
                  {uploadedDocuments.find((d) => d.document_type === docType)?.file_name}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveDocument(docType)}>
                  <XCircle size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Document Upload Modal */}
      {currentDocType && (
        <View style={styles.uploadModal}>
          <View style={styles.uploadModalContent}>
            <Text style={styles.uploadModalTitle}>
              Upload {getDocumentTypeLabel(currentDocType)}
            </Text>
            <DocumentUpload
              documentType={currentDocType}
              onUploadComplete={(url, metadata) =>
                handleDocumentUpload(currentDocType, url, metadata)
              }
              onCancel={() => setCurrentDocType(null)}
            />
          </View>
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          {uploadedDocuments.length} of {requiredDocs.length} required documents uploaded
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(uploadedDocuments.length / requiredDocs.length) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || uploadedDocuments.length === 0}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Upload size={20} color={colors.white} />
            <Text style={styles.submitButtonText}>Submit Resubmission</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your resubmission will be reviewed within 24-48 hours
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rejectionSection: {
    padding: spacing.lg,
    backgroundColor: colors.error + '10',
    borderBottomWidth: 3,
    borderBottomColor: colors.error,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rejectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  rejectionText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * 1.5,
  },
  suggestionsSection: {
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  suggestionsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: fontSize.sm * 1.5,
  },
  documentsSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  documentItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  documentLabels: {
    flex: 1,
  },
  documentName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  documentRequired: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xxs,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '20',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  uploadButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '20',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  uploadedText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  uploadedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  uploadedFileName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  uploadModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.text + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  uploadModalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 500,
  },
  uploadModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  progressSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
