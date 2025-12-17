import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Shield,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getProvider1099Forms,
  log1099Access,
  format1099Status,
  get1099StatusColor,
  type ProviderForm1099,
} from '@/lib/1099-distribution';
import { generateAndShare1099 } from '@/lib/1099-nec-pdf-generator';
import { calculate1099ForProvider } from '@/lib/1099-nec-calculation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function TaxFormsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<ProviderForm1099[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadForms();
    }
  }, [user]);

  const loadForms = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getProvider1099Forms(user.id);
      setForms(data);
    } catch (error) {
      console.error('Error loading tax forms:', error);
      Alert.alert('Error', 'Failed to load tax forms');
    } finally {
      setLoading(false);
    }
  };

  const handleViewForm = async (form: ProviderForm1099) => {
    if (!user?.id) return;

    setGeneratingId(form.id);
    try {
      // Log the access
      await log1099Access(form.id, user.id, 'viewed');

      // Get the full calculation data
      const summary = await calculate1099ForProvider(user.id, form.tax_year);

      if (!summary) {
        Alert.alert('Error', 'Unable to generate form at this time');
        return;
      }

      // Generate and share the form
      await generateAndShare1099(summary);

      // Reload forms to update status
      loadForms();
    } catch (error) {
      console.error('Error viewing form:', error);
      Alert.alert('Error', 'Failed to view tax form');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDownloadForm = async (form: ProviderForm1099) => {
    if (!user?.id) return;

    setGeneratingId(form.id);
    try {
      // Log the download
      await log1099Access(form.id, user.id, 'downloaded');

      // Get the full calculation data
      const summary = await calculate1099ForProvider(user.id, form.tax_year);

      if (!summary) {
        Alert.alert('Error', 'Unable to generate form at this time');
        return;
      }

      // Generate and share the form
      await generateAndShare1099(summary);

      // Reload forms to update status
      loadForms();
    } catch (error) {
      console.error('Error downloading form:', error);
      Alert.alert('Error', 'Failed to download tax form');
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your tax forms...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <FileText size={32} color={colors.primary} />
        <Text style={styles.title}>Tax Forms</Text>
        <Text style={styles.subtitle}>Your 1099-NEC Forms</Text>
      </View>

      {/* Security Notice */}
      <View style={styles.securityCard}>
        <Shield size={20} color={colors.primary} />
        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>Secure Access</Text>
          <Text style={styles.securityText}>
            Your tax forms are securely stored and all access is logged for your protection.
          </Text>
        </View>
      </View>

      {/* Forms List */}
      {forms.length > 0 ? (
        <View style={styles.formsList}>
          {forms.map((form) => (
            <View
              key={form.id}
              style={[
                styles.formCard,
                { borderLeftColor: get1099StatusColor(form.status) },
              ]}
            >
              {/* Header */}
              <View style={styles.formHeader}>
                <View style={styles.formHeaderLeft}>
                  <Text style={styles.formType}>{form.form_type}</Text>
                  <Text style={styles.formYear}>Tax Year {form.tax_year}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: get1099StatusColor(form.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: get1099StatusColor(form.status) },
                    ]}
                  >
                    {format1099Status(form.status)}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.amountSection}>
                <DollarSign size={20} color={colors.success} />
                <View style={styles.amountContent}>
                  <Text style={styles.amountLabel}>Box 1: Nonemployee Compensation</Text>
                  <Text style={styles.amountValue}>
                    ${form.nonemployee_compensation.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Info */}
              <View style={styles.formInfo}>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    Available since{' '}
                    {new Date(form.generated_at).toLocaleDateString()}
                  </Text>
                </View>

                {form.last_accessed_at && (
                  <View style={styles.infoRow}>
                    <Eye size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>
                      Last viewed {new Date(form.last_accessed_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <CheckCircle size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {form.viewed_count} view{form.viewed_count !== 1 ? 's' : ''} •{' '}
                    {form.downloaded_count} download
                    {form.downloaded_count !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.viewButton,
                    generatingId === form.id && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleViewForm(form)}
                  disabled={generatingId === form.id}
                >
                  {generatingId === form.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Eye size={16} color={colors.white} />
                      <Text style={styles.actionButtonText}>View</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.downloadButton,
                    generatingId === form.id && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleDownloadForm(form)}
                  disabled={generatingId === form.id}
                >
                  {generatingId === form.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Download size={16} color={colors.white} />
                      <Text style={styles.actionButtonText}>Download</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* First-time viewing notice */}
              {form.status === 'ready' && (
                <View style={styles.noticeBox}>
                  <AlertCircle size={14} color={colors.primary} />
                  <Text style={styles.noticeText}>
                    Click View or Download to access your form
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <FileText size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Tax Forms Available</Text>
          <Text style={styles.emptyText}>
            Your 1099-NEC forms will appear here once they're generated by the
            administrator.
          </Text>
        </View>
      )}

      {/* Information */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>About Your 1099-NEC Form</Text>
        <Text style={styles.infoCardText}>
          • Form 1099-NEC reports nonemployee compensation paid to you{'\n'}
          • You'll receive this form if you earned $600 or more{'\n'}
          • Use this information when filing your tax return{'\n'}
          • Report on Schedule C (Form 1040), line 1{'\n'}
          • Keep this form for your records
        </Text>
      </View>

      {/* Help */}
      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          If you have questions about your 1099-NEC form or need assistance, please
          contact support.
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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  securityCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.lg,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  securityText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  formsList: {
    gap: spacing.md,
  },
  formCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  formHeaderLeft: {
    flex: 1,
  },
  formType: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  formYear: {
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
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  amountContent: {
    flex: 1,
  },
  amountLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  formInfo: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  viewButton: {
    backgroundColor: colors.primary,
  },
  downloadButton: {
    backgroundColor: colors.secondary,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  noticeBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  infoCardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoCardText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  helpCard: {
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
  },
  helpTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
