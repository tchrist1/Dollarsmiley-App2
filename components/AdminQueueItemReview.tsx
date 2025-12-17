import React, { useState, useEffect } from 'react';
import { getContentModerationTimeline, type ContentModerationTimeline } from '@/lib/moderation';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {
  X,
  AlertTriangle,
  Shield,
  Ban,
  Flag,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react-native';
import {
  getQueueItemDetails,
  takeModerationAction,
  type QueueItemDetails,
} from '@/lib/moderation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface AdminQueueItemReviewProps {
  queueId: string;
  onClose: () => void;
  onActionComplete: () => void;
}

export default function AdminQueueItemReview({
  queueId,
  onClose,
  onActionComplete,
}: AdminQueueItemReviewProps) {
  const [details, setDetails] = useState<QueueItemDetails | null>(null);
  const [timeline, setTimeline] = useState<ContentModerationTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    loadDetails();
  }, [queueId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await getQueueItemDetails(queueId);
      setDetails(data);

      // Load moderation history timeline for this content
      if (data?.queue_item) {
        const history = await getContentModerationTimeline(
          data.queue_item.content_type,
          data.queue_item.content_id
        );
        setTimeline(history);
      }
    } catch (error) {
      console.error('Error loading details:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionType || !reason.trim()) {
      Alert.alert('Required', 'Please select an action and provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      const actionId = await takeModerationAction(
        queueId,
        actionType as any,
        reason.trim(),
        internalNotes.trim() || undefined
      );

      if (actionId) {
        Alert.alert(
          'Success',
          'Moderation action completed successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                onActionComplete();
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to take action');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete action. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const actions = [
    {
      type: 'dismiss',
      label: 'Dismiss',
      icon: ThumbsDown,
      color: colors.textSecondary,
      description: 'Report is invalid or false',
    },
    {
      type: 'warn',
      label: 'Warn User',
      icon: AlertTriangle,
      color: colors.secondary,
      description: 'Issue warning, 1 strike',
    },
    {
      type: 'remove_content',
      label: 'Remove Content',
      icon: Flag,
      color: colors.error,
      description: 'Delete content, 2 strikes',
    },
    {
      type: 'suspend_user',
      label: 'Suspend (7 days)',
      icon: Shield,
      color: '#FF6B6B',
      description: 'Temporary suspension, 3 strikes',
    },
    {
      type: 'ban_user',
      label: 'Ban User',
      icon: Ban,
      color: colors.error,
      description: 'Permanent ban, 5 strikes',
    },
    {
      type: 'escalate',
      label: 'Escalate',
      icon: AlertTriangle,
      color: colors.primary,
      description: 'Send to senior moderator',
    },
  ];

  if (loading) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!details) {
    return null;
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Review Report</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Content Snapshot */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reported Content</Text>
              <View style={styles.contentBox}>
                <Text style={styles.contentType}>
                  {details.queue_item.content_type}
                </Text>
                <Text style={styles.contentText} numberOfLines={10}>
                  {JSON.stringify(details.queue_item.content_snapshot, null, 2)}
                </Text>
              </View>
            </View>

            {/* Author Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content Author</Text>
              <View style={styles.authorBox}>
                <Text style={styles.authorName}>{details.author.full_name}</Text>
                <View style={styles.historyStats}>
                  <Text style={styles.statText}>
                    Reports: {details.author_history.total_reports}
                  </Text>
                  <Text style={styles.statText}>
                    Active Strikes: {details.author_history.active_strikes}
                  </Text>
                  <Text style={styles.statText}>
                    Total Strikes: {details.author_history.total_strikes}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reports */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Reports ({details.reports.length})
              </Text>
              {details.reports.map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportCategory}>
                      {report.category.icon} {report.category.name}
                    </Text>
                    <Text style={styles.reportSeverity}>
                      {report.category.severity}
                    </Text>
                  </View>
                  <Text style={styles.reportReason}>{report.reason}</Text>
                  {report.description && (
                    <Text style={styles.reportDescription}>
                      {report.description}
                    </Text>
                  )}
                  <Text style={styles.reportTime}>
                    {new Date(report.created_at).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Previous Actions */}
            {details.previous_actions && details.previous_actions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Previous Actions</Text>
                {details.previous_actions.map((action) => (
                  <View key={action.id} style={styles.actionCard}>
                    <Text style={styles.actionTypeText}>{action.action_type}</Text>
                    <Text style={styles.actionBy}>
                      by {action.moderator_name}
                    </Text>
                    <Text style={styles.actionReason}>{action.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Take Action</Text>
              <View style={styles.actionsGrid}>
                {actions.map((action) => {
                  const Icon = action.icon;
                  const selected = actionType === action.type;

                  return (
                    <TouchableOpacity
                      key={action.type}
                      style={[
                        styles.actionButton,
                        selected && {
                          borderColor: action.color,
                          backgroundColor: action.color + '10',
                        },
                      ]}
                      onPress={() => setActionType(action.type)}
                    >
                      <Icon
                        size={24}
                        color={selected ? action.color : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.actionLabel,
                          selected && { color: action.color },
                        ]}
                      >
                        {action.label}
                      </Text>
                      <Text style={styles.actionDesc}>{action.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Reason Input */}
            {actionType && (
              <View style={styles.section}>
                <Text style={styles.label}>Reason (Required)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Explain your decision..."
                  placeholderTextColor={colors.textSecondary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>Internal Notes (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Notes for other moderators..."
                  placeholderTextColor={colors.textSecondary}
                  value={internalNotes}
                  onChangeText={setInternalNotes}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>

          {actionType && (
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
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={handleAction}
                disabled={submitting || !reason.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Confirm Action</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  modal: {
    width: '95%',
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  contentBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  contentType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  contentText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  authorBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  authorName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  historyStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reportCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportCategory: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  reportSeverity: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
    textTransform: 'uppercase',
  },
  reportReason: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  reportDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  reportTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actionCard: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  actionTypeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  actionBy: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionReason: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    width: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  actionDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
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
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
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
