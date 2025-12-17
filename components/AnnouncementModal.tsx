import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { X, ExternalLink, Check } from 'lucide-react-native';
import {
  type UserAnnouncement,
  acknowledgeAnnouncement,
  getAnnouncementTypeColor,
  getAnnouncementTypeIcon,
  getPriorityColor,
} from '@/lib/announcements';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface AnnouncementModalProps {
  visible: boolean;
  announcement: UserAnnouncement | null;
  onClose: () => void;
  onAcknowledge?: () => void;
}

export default function AnnouncementModal({
  visible,
  announcement,
  onClose,
  onAcknowledge,
}: AnnouncementModalProps) {
  if (!announcement) return null;

  const typeColor = getAnnouncementTypeColor(announcement.type);
  const typeIcon = announcement.icon || getAnnouncementTypeIcon(announcement.type);
  const priorityColor = getPriorityColor(announcement.priority);

  const handleAcknowledge = async () => {
    const success = await acknowledgeAnnouncement(announcement.id);
    if (success) {
      onAcknowledge?.();
      onClose();
    }
  };

  const handleAction = () => {
    if (announcement.action_url) {
      Linking.openURL(announcement.action_url);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={[styles.header, { backgroundColor: typeColor + '10' }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>{typeIcon}</Text>
              <View style={styles.headerText}>
                <Text style={styles.title}>{announcement.title}</Text>
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: typeColor + '20' },
                    ]}
                  >
                    <Text style={[styles.typeText, { color: typeColor }]}>
                      {announcement.type.toUpperCase()}
                    </Text>
                  </View>
                  {announcement.priority !== 'low' && (
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: priorityColor + '20' },
                      ]}
                    >
                      <Text style={[styles.priorityText, { color: priorityColor }]}>
                        {announcement.priority.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.message}>{announcement.content}</Text>

            {announcement.published_at && (
              <View style={styles.metaInfo}>
                <Text style={styles.metaLabel}>Published:</Text>
                <Text style={styles.metaValue}>
                  {new Date(announcement.published_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            {announcement.expires_at && (
              <View style={styles.metaInfo}>
                <Text style={styles.metaLabel}>Expires:</Text>
                <Text style={styles.metaValue}>
                  {new Date(announcement.expires_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {announcement.action_text && announcement.action_url && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: typeColor }]}
                onPress={handleAction}
              >
                <Text style={styles.actionButtonText}>{announcement.action_text}</Text>
                <ExternalLink size={18} color={colors.white} />
              </TouchableOpacity>
            )}

            {!announcement.is_acknowledged && (
              <TouchableOpacity
                style={[
                  styles.acknowledgeButton,
                  !announcement.action_text && { flex: 1 },
                ]}
                onPress={handleAcknowledge}
              >
                <Check size={18} color={colors.primary} />
                <Text style={styles.acknowledgeButtonText}>Got it</Text>
              </TouchableOpacity>
            )}

            {announcement.is_acknowledged && (
              <TouchableOpacity
                style={[styles.closeOnlyButton, { flex: 1 }]}
                onPress={onClose}
              >
                <Text style={styles.closeOnlyButtonText}>Close</Text>
              </TouchableOpacity>
            )}
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerIcon: {
    fontSize: 32,
  },
  headerText: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 28,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  metaValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  acknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  acknowledgeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  closeOnlyButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  closeOnlyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
