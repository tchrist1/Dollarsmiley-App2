import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Calendar,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import W9TaxForm from '@/components/W9TaxForm';
import {
  getCurrentW9,
  getW9Status,
  getW9History,
  formatTaxClassification,
  formatW9Status,
  getW9StatusColor,
  isW9Expired,
  type W9TaxInformation,
  type W9SubmissionHistory,
} from '@/lib/w9-tax-information';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { router } from 'expo-router';

export default function W9TaxInformationScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentW9, setCurrentW9] = useState<W9TaxInformation | null>(null);
  const [status, setStatus] = useState<string>('not_submitted');
  const [history, setHistory] = useState<W9SubmissionHistory[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadW9Data();
    }
  }, [user]);

  const loadW9Data = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [w9, w9Status, w9History] = await Promise.all([
        getCurrentW9(user.id),
        getW9Status(user.id),
        getW9History(user.id),
      ]);

      setCurrentW9(w9);
      setStatus(w9Status);
      setHistory(w9History);

      // Show form if no W-9 or if needs revision
      if (!w9 || w9Status === 'needs_revision') {
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error loading W-9 data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    loadW9Data();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={32} color={colors.success} />;
      case 'pending':
        return <Clock size={32} color={colors.warning} />;
      case 'rejected':
        return <XCircle size={32} color={colors.error} />;
      case 'needs_revision':
        return <AlertCircle size={32} color={colors.warning} />;
      default:
        return <FileText size={32} color={colors.textSecondary} />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'approved':
        return 'Your W-9 form has been approved';
      case 'pending':
        return 'Your W-9 form is under review';
      case 'rejected':
        return 'Your W-9 form was rejected';
      case 'needs_revision':
        return 'Your W-9 form needs revision';
      default:
        return 'No W-9 form on file';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading W-9 information...</Text>
      </View>
    );
  }

  if (showForm) {
    return <W9TaxForm providerId={user?.id || ''} onSubmitSuccess={handleFormSubmit} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>W-9 Tax Information</Text>
        <Text style={styles.subtitle}>Form W-9: Request for Taxpayer Identification Number</Text>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, { borderLeftColor: getW9StatusColor(status as any) }]}>
        <View style={styles.statusHeader}>
          {getStatusIcon()}
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>{getStatusMessage()}</Text>
            <Text style={styles.statusSubtitle}>{formatW9Status(status as any)}</Text>
          </View>
        </View>

        {currentW9?.admin_notes && (
          <View style={styles.adminNotesBox}>
            <Text style={styles.adminNotesLabel}>Admin Notes:</Text>
            <Text style={styles.adminNotesText}>{currentW9.admin_notes}</Text>
          </View>
        )}

        {status === 'needs_revision' && (
          <TouchableOpacity
            style={styles.reviseButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.reviseButtonText}>Submit Revised Form</Text>
          </TouchableOpacity>
        )}

        {status === 'not_submitted' && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => setShowForm(true)}
          >
            <FileText size={20} color={colors.white} />
            <Text style={styles.submitButtonText}>Submit W-9 Form</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Current W-9 Details */}
      {currentW9 && (
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Current W-9 Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax Classification:</Text>
            <Text style={styles.detailValue}>
              {formatTaxClassification(currentW9.tax_classification)}
            </Text>
          </View>

          {currentW9.business_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Business Name:</Text>
              <Text style={styles.detailValue}>{currentW9.business_name}</Text>
            </View>
          )}

          {currentW9.ein && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>EIN:</Text>
              <Text style={styles.detailValue}>
                {currentW9.ein.replace(/(\d{2})(\d{7})/, '**-***$2')}
              </Text>
            </View>
          )}

          {currentW9.ssn_last_4 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SSN:</Text>
              <Text style={styles.detailValue}>***-**-{currentW9.ssn_last_4}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>
              {currentW9.address_line_1}
              {currentW9.address_line_2 && `, ${currentW9.address_line_2}`}
              {'\n'}
              {currentW9.city}, {currentW9.state} {currentW9.zip_code}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Submitted:</Text>
            <Text style={styles.detailValue}>
              {new Date(currentW9.submitted_at).toLocaleDateString()}
            </Text>
          </View>

          {currentW9.reviewed_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reviewed:</Text>
              <Text style={styles.detailValue}>
                {new Date(currentW9.reviewed_at).toLocaleDateString()}
              </Text>
            </View>
          )}

          {isW9Expired(currentW9.submitted_at) && (
            <View style={styles.warningBox}>
              <AlertCircle size={16} color={colors.warning} />
              <Text style={styles.warningText}>
                This W-9 is over 3 years old. Consider submitting an updated form.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Why W-9 is Required */}
      <View style={styles.infoCard}>
        <Shield size={24} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Why is W-9 Required?</Text>
          <Text style={styles.infoText}>
            The IRS requires businesses to collect W-9 forms from service providers who earn
            $600 or more per year. This information is used for tax reporting purposes
            (Form 1099-NEC).
          </Text>
        </View>
      </View>

      {/* Submission History */}
      {history.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.cardTitle}>Submission History</Text>

          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                {item.action === 'approved' && (
                  <CheckCircle size={16} color={colors.success} />
                )}
                {item.action === 'rejected' && <XCircle size={16} color={colors.error} />}
                {item.action === 'submitted' && <Clock size={16} color={colors.warning} />}
                {item.action === 'revised' && (
                  <AlertCircle size={16} color={colors.warning} />
                )}
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyAction}>
                  {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
                {item.notes && <Text style={styles.historyNotes}>{item.notes}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Security Notice */}
      <View style={styles.securityCard}>
        <Text style={styles.securityTitle}>Data Security</Text>
        <Text style={styles.securityText}>
          • Your tax information is encrypted and stored securely{'\n'}
          • Only authorized administrators can review your W-9{'\n'}
          • We never share your information with third parties{'\n'}
          • All submissions are logged for audit purposes
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  adminNotesBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  adminNotesLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  adminNotesText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  reviseButton: {
    padding: spacing.md,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  reviseButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  detailsCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  historyCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  historyItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyIcon: {
    marginTop: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyAction: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  historyDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyNotes: {
    fontSize: fontSize.xs,
    color: colors.text,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  securityCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  securityTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  securityText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
