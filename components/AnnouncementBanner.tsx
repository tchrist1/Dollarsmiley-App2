import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking } from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import {
  type UserAnnouncement,
  dismissAnnouncement,
  getAnnouncementTypeColor,
  getAnnouncementTypeIcon,
} from '@/lib/announcements';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface AnnouncementBannerProps {
  announcement: UserAnnouncement;
  onDismiss?: () => void;
  onPress?: () => void;
}

export default function AnnouncementBanner({
  announcement,
  onDismiss,
  onPress,
}: AnnouncementBannerProps) {
  const typeColor = getAnnouncementTypeColor(announcement.type);
  const typeIcon = announcement.icon || getAnnouncementTypeIcon(announcement.type);

  const handleDismiss = async () => {
    const success = await dismissAnnouncement(announcement.id);
    if (success) {
      onDismiss?.();
    }
  };

  const handleAction = () => {
    if (announcement.action_url) {
      Linking.openURL(announcement.action_url);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <View style={[styles.container, { borderLeftColor: typeColor }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{typeIcon}</Text>

        <View style={styles.textContent}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {announcement.title}
            </Text>
            {announcement.priority === 'urgent' && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {announcement.content}
          </Text>

          {announcement.action_text && (
            <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
              <Text style={[styles.actionText, { color: typeColor }]}>
                {announcement.action_text}
              </Text>
              <ChevronRight size={14} color={typeColor} />
            </TouchableOpacity>
          )}
        </View>

        {announcement.is_dismissible && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginTop: 2,
  },
  textContent: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  urgentBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
  },
  urgentText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  dismissButton: {
    padding: spacing.xs,
  },
});
