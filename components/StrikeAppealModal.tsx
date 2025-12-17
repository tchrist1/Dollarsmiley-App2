import React, { useState } from 'react';
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
import { X, FileText, Send } from 'lucide-react-native';
import { submitStrikeAppeal, type ContentStrike } from '@/lib/content-reports';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface StrikeAppealModalProps {
  visible: boolean;
  strike: ContentStrike | null;
  onClose: () => void;
  onAppealSubmitted?: () => void;
}

export default function StrikeAppealModal({
  visible,
  strike,
  onClose,
  onAppealSubmitted,
}: StrikeAppealModalProps) {
  const [appealReason, setAppealReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!appealReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for your appeal');
      return;
    }

    if (!strike) return;

    setSubmitting(true);
    try {
      const success = await submitStrikeAppeal(strike.id, appealReason.trim());

      if (success) {
        Alert.alert(
          'Appeal Submitted',
          'Your appeal has been submitted and will be reviewed by our moderation team. You will be notified of the decision.',
          [
            {
              text: 'OK',
              onPress: () => {
                setAppealReason('');
                onAppealSubmitted?.();
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to submit appeal');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to submit appeal. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'severe':
        return '#EA580C';
      case 'moderate':
        return '#F59E0B';
      case 'minor':
        return '#10B981';
      default:
        return colors.textSecondary;
    }
  };

  if (!strike) return null;

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
              <FileText size={24} color={colors.primary} />
              <Text style={styles.title}>Appeal Strike</Text>
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
            <View style={styles.strikeDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Violation</Text>
                <Text style={styles.detailValue}>{strike.violation_category}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Severity</Text>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(strike.severity) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.severityText,
                      { color: getSeverityColor(strike.severity) },
                    ]}
                  >
                    {strike.severity}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Strike Points</Text>
                <Text style={styles.strikeCount}>{strike.strike_count}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(strike.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              {strike.violation_description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.description}>
                    {strike.violation_description}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.appealSection}>
              <Text style={styles.sectionTitle}>Why should this strike be removed?</Text>
              <Text style={styles.sectionDescription}>
                Explain why you believe this strike was issued in error or provide additional
                context that wasn't considered.
              </Text>

              <TextInput
                style={styles.textArea}
                placeholder="Provide a detailed explanation for your appeal..."
                placeholderTextColor={colors.textSecondary}
                value={appealReason}
                onChangeText={setAppealReason}
                multiline
                numberOfLines={8}
                maxLength={1000}
                textAlignVertical="top"
                editable={!submitting}
              />
              <Text style={styles.charCount}>{appealReason.length}/1000</Text>

              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>Tips for a successful appeal:</Text>
                <Text style={styles.tip}>• Be specific and factual</Text>
                <Text style={styles.tip}>• Provide relevant context</Text>
                <Text style={styles.tip}>• Acknowledge any misunderstanding</Text>
                <Text style={styles.tip}>• Explain how you'll prevent future issues</Text>
              </View>
            </View>
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
                (!appealReason.trim() || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!appealReason.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Send size={18} color={colors.white} />
                  <Text style={styles.submitButtonText}>Submit Appeal</Text>
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
  strikeDetails: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  strikeCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  descriptionContainer: {
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  appealSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 150,
    marginTop: spacing.sm,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  tipsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tip: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
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
