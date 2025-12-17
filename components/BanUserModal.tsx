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
import { X, Ban, AlertTriangle, Send } from 'lucide-react-native';
import { suspendUser } from '@/lib/suspensions';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface BanUserModalProps {
  visible: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
  onBanned?: () => void;
}

const SEVERITY_OPTIONS = [
  { value: 'severe', label: 'Severe', description: 'Serious violations' },
  { value: 'critical', label: 'Critical', description: 'Extreme violations or threats' },
] as const;

export default function BanUserModal({
  visible,
  userId,
  userName,
  onClose,
  onBanned,
}: BanUserModalProps) {
  const [severity, setSeverity] = useState<'severe' | 'critical'>('severe');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for the permanent ban');
      return;
    }

    if (confirmText.toLowerCase() !== 'ban permanently') {
      Alert.alert('Confirmation Required', 'Please type "BAN PERMANENTLY" to confirm');
      return;
    }

    setSubmitting(true);
    try {
      const result = await suspendUser(
        userId,
        'permanent',
        reason.trim(),
        details.trim() || undefined,
        severity
      );

      if (result.success) {
        Alert.alert(
          'User Banned',
          `${userName} has been permanently banned from the platform.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setReason('');
                setDetails('');
                setConfirmText('');
                setSeverity('severe');
                onBanned?.();
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to ban user');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to ban user');
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
              <Ban size={24} color={colors.error} />
              <Text style={styles.title}>Permanent Ban</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={submitting}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.dangerAlert}>
              <AlertTriangle size={24} color={colors.error} />
              <View style={styles.dangerAlertContent}>
                <Text style={styles.dangerAlertTitle}>Permanent Action</Text>
                <Text style={styles.dangerAlertText}>
                  This will permanently ban the user from accessing the platform. This action
                  cannot be reversed without admin intervention.
                </Text>
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userInfoLabel}>User:</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Severity Level</Text>
              {SEVERITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.severityOption,
                    severity === option.value && styles.severityOptionSelected,
                  ]}
                  onPress={() => setSeverity(option.value)}
                  disabled={submitting}
                >
                  <View style={styles.severityOptionContent}>
                    <Text
                      style={[
                        styles.severityLabel,
                        severity === option.value && styles.severityLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.severityDescription}>{option.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      severity === option.value && styles.radioSelected,
                    ]}
                  >
                    {severity === option.value && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason for Ban *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Severe harassment, threats, or illegal activity"
                placeholderTextColor={colors.textSecondary}
                value={reason}
                onChangeText={setReason}
                maxLength={300}
                editable={!submitting}
              />
              <Text style={styles.charCount}>{reason.length}/300</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detailed Explanation *</Text>
              <Text style={styles.sectionDescription}>
                Provide a comprehensive explanation of the violations that led to this decision.
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Include specific incidents, dates, and evidence..."
                placeholderTextColor={colors.textSecondary}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
                editable={!submitting}
              />
              <Text style={styles.charCount}>{details.length}/1000</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Confirmation</Text>
              <Text style={styles.confirmInstructions}>
                Type <Text style={styles.confirmPhrase}>BAN PERMANENTLY</Text> to confirm this
                action
              </Text>
              <TextInput
                style={[
                  styles.input,
                  confirmText.toLowerCase() === 'ban permanently' && styles.inputValid,
                ]}
                placeholder="Type here..."
                placeholderTextColor={colors.textSecondary}
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                editable={!submitting}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!reason.trim() ||
                  confirmText.toLowerCase() !== 'ban permanently' ||
                  submitting) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                !reason.trim() || confirmText.toLowerCase() !== 'ban permanently' || submitting
              }
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ban size={18} color={colors.white} />
                  <Text style={styles.submitButtonText}>Ban Permanently</Text>
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
  dangerAlert: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.error + '10',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.error,
    marginBottom: spacing.lg,
  },
  dangerAlertContent: {
    flex: 1,
  },
  dangerAlertTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  dangerAlertText: {
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: 20,
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
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  severityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  severityOptionSelected: {
    borderColor: colors.error,
    backgroundColor: colors.error + '05',
  },
  severityOptionContent: {
    flex: 1,
  },
  severityLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  severityLabelSelected: {
    color: colors.error,
  },
  severityDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.error,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputValid: {
    borderColor: colors.success,
    backgroundColor: colors.success + '05',
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 120,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  confirmInstructions: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  confirmPhrase: {
    fontWeight: fontWeight.bold,
    color: colors.error,
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
