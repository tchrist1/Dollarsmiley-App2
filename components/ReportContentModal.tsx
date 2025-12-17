import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, AlertCircle, Send } from 'lucide-react-native';
import {
  getReportCategories,
  submitContentReport,
  type ReportCategory,
} from '@/lib/content-reports';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ReportContentModalProps {
  visible: boolean;
  contentType: 'post' | 'comment' | 'review' | 'listing' | 'user' | 'message' | 'booking';
  contentId: string;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

export default function ReportContentModal({
  visible,
  contentType,
  contentId,
  onClose,
  onReportSubmitted,
}: ReportContentModalProps) {
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCategories();
    } else {
      setSelectedCategory(null);
      setDescription('');
    }
  }, [visible, contentType]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getReportCategories(contentType);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Required', 'Please select a reason for reporting');
      return;
    }

    const category = categories.find((c) => c.id === selectedCategory);
    if (!category) return;

    setSubmitting(true);
    try {
      const reportId = await submitContentReport(
        contentType,
        contentId,
        selectedCategory,
        category.name,
        description || undefined
      );

      if (reportId) {
        Alert.alert(
          'Report Submitted',
          'Thank you for helping keep our community safe. We will review your report shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                onReportSubmitted?.();
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to submit report. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return colors.secondary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AlertCircle size={24} color={colors.error} />
              <Text style={styles.title}>Report Content</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={submitting}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              Help us understand what's wrong with this {contentType}
            </Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.categoriesContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        selectedCategory === category.id && styles.categoryCardSelected,
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                      disabled={submitting}
                    >
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text
                          style={[
                            styles.categoryName,
                            selectedCategory === category.id &&
                              styles.categoryNameSelected,
                          ]}
                        >
                          {category.name}
                        </Text>
                        <View
                          style={[
                            styles.severityBadge,
                            {
                              backgroundColor:
                                getSeverityColor(category.severity) + '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.severityText,
                              { color: getSeverityColor(category.severity) },
                            ]}
                          >
                            {category.severity}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedCategory && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.label}>
                      Additional Details (Optional)
                    </Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Provide more context about this issue..."
                      placeholderTextColor={colors.textSecondary}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                      textAlignVertical="top"
                      editable={!submitting}
                    />
                    <Text style={styles.charCount}>
                      {description.length}/500
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedCategory || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedCategory || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Send size={18} color={colors.white} />
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  categoriesContainer: {
    gap: spacing.md,
  },
  categoryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  categoryNameSelected: {
    color: colors.primary,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  categoryDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  detailsSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
