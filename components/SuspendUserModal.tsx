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
import { X, AlertTriangle, Clock, Send } from 'lucide-react-native';
import { suspendUser, formatDuration } from '@/lib/suspensions';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface SuspendUserModalProps {
  visible: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
  onSuspended?: () => void;
}

const DURATION_OPTIONS = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
];

const SEVERITY_OPTIONS = [
  { value: 'warning', label: 'Warning', color: '#3B82F6' },
  { value: 'minor', label: 'Minor', color: '#10B981' },
  { value: 'moderate', label: 'Moderate', color: '#F59E0B' },
  { value: 'severe', label: 'Severe', color: '#EA580C' },
  { value: 'critical', label: 'Critical', color: '#DC2626' },
] as const;

export default function SuspendUserModal({
  visible,
  userId,
  userName,
  onClose,
  onSuspended,
}: SuspendUserModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(DURATION_OPTIONS[2].days);
  const [severity, setSeverity] = useState<'warning' | 'minor' | 'moderate' | 'severe' | 'critical'>('moderate');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for the suspension');
      return;
    }

    if (!selectedDuration) {
      Alert.alert('Required', 'Please select a suspension duration');
      return;
    }

    setSubmitting(true);
    try {
      const result = await suspendUser(
        userId,
        'temporary',
        reason.trim(),
        details.trim() || undefined,
        severity,
        selectedDuration
      );

      if (result.success) {
        Alert.alert(
          'User Suspended',
          `${userName} has been suspended for ${formatDuration(selectedDuration)}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setReason('');
                setDetails('');
                setSelectedDuration(DURATION_OPTIONS[2].days);
                setSeverity('moderate');
                onSuspended?.();
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to suspend user');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to suspend user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AlertTriangle size={24} color={colors.error} />
              <Text style={styles.title}>Suspend User</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={submitting}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.userInfo}>
              <Text style={styles.userInfoLabel}>User:</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Suspension Duration</Text>
              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.days}
                    style={[
                      styles.durationOption,
                      selectedDuration === option.days && styles.durationOptionSelected,
                    ]}
                    onPress={() => setSelectedDuration(option.days)}
                    disabled={submitting}
                  >
                    <Clock
                      size={16}
                      color={
                        selectedDuration === option.days ? colors.primary : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.durationOptionText,
                        selectedDuration === option.days && styles.durationOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Severity Level</Text>
              <View style={styles.severityGrid}>
                {SEVERITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.severityOption,
                      severity === option.value && {
                        borderColor: option.color,
                        backgroundColor: option.color + '15',
                      },
                    ]}
                    onPress={() => setSeverity(option.value)}
                    disabled={submitting}
                  >
                    <View
                      style={[
                        styles.severityIndicator,
                        { backgroundColor: option.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.severityText,
                        severity === option.value && { color: option.color, fontWeight: '600' },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason for Suspension *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Repeated violations of community guidelines"
                placeholderTextColor={colors.textSecondary}
                value={reason}
                onChangeText={setReason}
                maxLength={200}
                editable={!submitting}
              />
              <Text style={styles.charCount}>{reason.length}/200</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Provide additional context or specific violations..."
                placeholderTextColor={colors.textSecondary}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
                editable={!submitting}
              />
              <Text style={styles.charCount}>{details.length}/500</Text>
            </View>

            <View style={styles.warningBox}>
              <AlertTriangle size={20} color={colors.error} />
              <Text style={styles.warningText}>
                The user will be notified of this suspension and will not be able to access the
                platform until the suspension expires.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!reason.trim() || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!reason.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Send size={18} color={colors.white} />
                  <Text style={styles.submitButtonText}>Suspend User</Text>
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  userInfoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  durationOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  durationOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  durationOptionTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  severityGrid: {
    gap: spacing.sm,
  },
  severityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  severityText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
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
    marginTop: spacing.xs,
  },
  warningBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.error + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: 20,
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
    backgroundColor: colors.error,
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
