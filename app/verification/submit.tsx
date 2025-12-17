import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentUpload } from '@/components/DocumentUpload';
import { Button } from '@/components/Button';
import {
  ArrowLeft,
  Shield,
  FileText,
  Briefcase,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface UploadedDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface DocumentsByType {
  Identity: UploadedDocument[];
  Business: UploadedDocument[];
  Background: UploadedDocument[];
}

export default function VerificationSubmitScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentsByType>({
    Identity: [],
    Business: [],
    Background: [],
  });
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    if (profile) {
      checkExistingRequest();
    }
  }, [profile]);

  const checkExistingRequest = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('provider_verification_requests')
      .select('*')
      .eq('provider_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && data.status !== 'Rejected') {
      setExistingRequest(data);
    }
  };

  const handleAddDocument = (type: keyof DocumentsByType, document: UploadedDocument) => {
    setDocuments((prev) => ({
      ...prev,
      [type]: [...prev[type], document],
    }));
  };

  const handleRemoveDocument = (type: keyof DocumentsByType, documentId: string) => {
    setDocuments((prev) => ({
      ...prev,
      [type]: prev[type].filter((doc) => doc.id !== documentId),
    }));
  };

  const getTotalDocuments = () => {
    return documents.Identity.length + documents.Business.length + documents.Background.length;
  };

  const canSubmit = () => {
    return documents.Identity.length >= 1 && getTotalDocuments() >= 2;
  };

  const handleSubmit = async () => {
    if (!profile || !canSubmit()) {
      Alert.alert('Incomplete', 'Please upload at least 1 identity document and 2 total documents');
      return;
    }

    setLoading(true);

    try {
      const { data: request, error: requestError } = await supabase
        .from('provider_verification_requests')
        .insert({
          provider_id: profile.id,
          verification_type: 'All',
          status: 'Pending',
        })
        .select()
        .single();

      if (requestError || !request) {
        throw new Error('Failed to create verification request');
      }

      const allDocuments = [
        ...documents.Identity.map((doc) => ({ ...doc, type: 'ID' })),
        ...documents.Business.map((doc) => ({ ...doc, type: 'License' })),
        ...documents.Background.map((doc) => ({ ...doc, type: 'Certificate' })),
      ];

      for (const doc of allDocuments) {
        await supabase.from('verification_documents').insert({
          request_id: request.id,
          user_id: profile.id,
          document_type: doc.type,
          document_url: doc.fileUrl,
          status: 'Pending',
          notes: additionalNotes || null,
        });
      }

      Alert.alert(
        'Verification Submitted',
        'Your verification documents have been submitted for review. We will notify you once the review is complete.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please sign in to submit verification</Text>
      </View>
    );
  }

  if (existingRequest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Status</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statusCard}>
            {existingRequest.status === 'Pending' && (
              <>
                <AlertCircle size={64} color={colors.warning} />
                <Text style={styles.statusTitle}>Verification Pending</Text>
                <Text style={styles.statusText}>
                  Your verification request is pending review. We will notify you once our team has
                  reviewed your documents.
                </Text>
              </>
            )}

            {existingRequest.status === 'UnderReview' && (
              <>
                <Shield size={64} color={colors.primary} />
                <Text style={styles.statusTitle}>Under Review</Text>
                <Text style={styles.statusText}>
                  Our team is currently reviewing your verification documents. This usually takes
                  1-3 business days.
                </Text>
              </>
            )}

            {existingRequest.status === 'Approved' && (
              <>
                <CheckCircle size={64} color={colors.success} />
                <Text style={styles.statusTitle}>Verified</Text>
                <Text style={styles.statusText}>
                  Congratulations! Your account has been verified. You now have access to all
                  provider features.
                </Text>
              </>
            )}

            <View style={styles.requestDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Request ID</Text>
                <Text style={styles.detailValue}>
                  #{existingRequest.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submitted</Text>
                <Text style={styles.detailValue}>
                  {new Date(existingRequest.submitted_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(existingRequest.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getStatusColor(existingRequest.status) },
                    ]}
                  >
                    {existingRequest.status}
                  </Text>
                </View>
              </View>
            </View>

            <Button
              title="Back to Profile"
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.backToProfileButton}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Verification</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Shield size={48} color={colors.primary} />
          <Text style={styles.infoTitle}>Verify Your Account</Text>
          <Text style={styles.infoText}>
            Complete verification to build trust with customers and unlock premium features. Upload
            the required documents below.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Identity Verification</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Upload a government-issued ID (Driver's License, Passport, or National ID)
          </Text>
          <DocumentUpload
            documentType="Identity Documents"
            documents={documents.Identity}
            onUpload={(doc) => handleAddDocument('Identity', doc)}
            onRemove={(id) => handleRemoveDocument('Identity', id)}
            maxDocuments={2}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Briefcase size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Business Verification</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Upload business licenses, certifications, or insurance documents
          </Text>
          <DocumentUpload
            documentType="Business Documents"
            documents={documents.Business}
            onUpload={(doc) => handleAddDocument('Business', doc)}
            onRemove={(id) => handleRemoveDocument('Business', id)}
            maxDocuments={3}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Background Check</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Upload background check results or reference letters
          </Text>
          <DocumentUpload
            documentType="Background Documents"
            documents={documents.Background}
            onUpload={(doc) => handleAddDocument('Background', doc)}
            onRemove={(id) => handleRemoveDocument('Background', id)}
            maxDocuments={2}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional information for the verification team..."
            placeholderTextColor={colors.textLight}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Submission Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Documents</Text>
            <Text style={styles.summaryValue}>{getTotalDocuments()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Identity Documents</Text>
            <Text style={styles.summaryValue}>{documents.Identity.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Business Documents</Text>
            <Text style={styles.summaryValue}>{documents.Business.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Background Documents</Text>
            <Text style={styles.summaryValue}>{documents.Background.length}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Submit for Verification"
            onPress={handleSubmit}
            disabled={!canSubmit() || loading}
            loading={loading}
          />
          <Text style={styles.footerNote}>
            Review typically takes 1-3 business days
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  infoTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  requiredBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.error,
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  optionalBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  notesInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footerNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  statusCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.lg,
  },
  statusTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  requestDetails: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  backToProfileButton: {
    width: '100%',
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
