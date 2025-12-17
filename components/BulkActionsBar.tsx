import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useState } from 'react';
import {
  CheckSquare,
  XSquare,
  Trash2,
  Send,
  Shield,
  Award,
  CreditCard,
  X,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  executeBulkOperation,
  getBulkOperationSummary,
  type BulkOperationType,
  type BulkOperationResult,
} from '@/lib/bulk-operations';

interface BulkAction {
  id: BulkOperationType;
  label: string;
  icon: React.ReactNode;
  color: string;
  requiresReason?: boolean;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  confirmMessage?: string;
  dangerous?: boolean;
}

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  adminId: string;
  actions: BulkAction[];
  entityName: string;
}

export default function BulkActionsBar({
  selectedIds,
  onClearSelection,
  adminId,
  actions,
  entityName,
}: BulkActionsBarProps) {
  const [executing, setExecuting] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<BulkAction | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [reasonValue, setReasonValue] = useState('');

  if (selectedIds.length === 0) {
    return null;
  }

  const handleAction = (action: BulkAction) => {
    if (action.requiresReason || action.requiresInput) {
      setCurrentAction(action);
      setShowInputModal(true);
      return;
    }

    confirmAction(action);
  };

  const confirmAction = (action: BulkAction) => {
    const message =
      action.confirmMessage ||
      `Are you sure you want to ${action.label.toLowerCase()} ${selectedIds.length} ${entityName}(s)?`;

    Alert.alert(
      'Confirm Action',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action.dangerous ? 'destructive' : 'default',
          onPress: () => executeAction(action),
        },
      ]
    );
  };

  const executeAction = async (action: BulkAction) => {
    setExecuting(true);
    setShowInputModal(false);

    try {
      const metadata: Record<string, any> = {};

      if (action.requiresReason && reasonValue) {
        metadata.reason = reasonValue;
      }

      if (action.requiresInput && inputValue) {
        if (action.id === 'send_notifications') {
          const [title, ...messageParts] = inputValue.split('\n');
          metadata.title = title;
          metadata.message = messageParts.join('\n');
        } else if (action.id === 'update_subscription') {
          metadata.planId = inputValue;
        } else if (action.id === 'add_badge') {
          metadata.badgeType = inputValue;
          metadata.reason = reasonValue;
        }
      }

      const result = await executeBulkOperation({
        type: action.id,
        targetIds: selectedIds,
        adminId,
        reason: reasonValue || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      const summary = getBulkOperationSummary(result);
      const details =
        result.failed > 0
          ? `\n\nErrors:\n${result.errors.map((e) => `• ${e.error}`).join('\n')}`
          : '';

      Alert.alert('Bulk Operation Complete', summary + details);

      if (result.success > 0) {
        onClearSelection();
        setInputValue('');
        setReasonValue('');
      }
    } catch (error: any) {
      Alert.alert('Operation Failed', error.message || 'Failed to execute bulk operation');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.info}>
          <CheckSquare size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            {selectedIds.length} {entityName}(s) selected
          </Text>
        </View>

        <View style={styles.actions}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionButton,
                { backgroundColor: action.color + '20', borderColor: action.color },
              ]}
              onPress={() => handleAction(action)}
              disabled={executing}
            >
              {action.icon}
              <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearSelection}
            disabled={executing}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {executing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </View>

      <Modal visible={showInputModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentAction?.label}</Text>
              <TouchableOpacity onPress={() => setShowInputModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {currentAction?.requiresInput && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {currentAction.inputLabel || 'Input Value'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={currentAction.inputPlaceholder || 'Enter value...'}
                    placeholderTextColor={colors.textLight}
                    value={inputValue}
                    onChangeText={setInputValue}
                    multiline={currentAction.id === 'send_notifications'}
                    numberOfLines={currentAction.id === 'send_notifications' ? 4 : 1}
                  />
                </View>
              )}

              {currentAction?.requiresReason && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reason</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter reason..."
                    placeholderTextColor={colors.textLight}
                    value={reasonValue}
                    onChangeText={setReasonValue}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              <Text style={styles.selectionInfo}>
                This will affect {selectedIds.length} {entityName}(s)
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowInputModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  currentAction?.dangerous && styles.modalDangerButton,
                ]}
                onPress={() => currentAction && executeAction(currentAction)}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.md,
    ...shadows.sm,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  clearButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 500,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalContent: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalDangerButton: {
    backgroundColor: colors.error,
  },
  modalConfirmText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
