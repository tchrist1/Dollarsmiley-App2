import React from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity } from 'react-native';
import { Clock, AlertTriangle, Shield, Ban, Flag, XCircle } from 'lucide-react-native';
import {
  type UserModerationHistory,
  formatActionType,
  getSeverityColor,
} from '@/lib/moderation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ModerationHistoryTimelineProps {
  history: UserModerationHistory[];
  emptyMessage?: string;
}

export default function ModerationHistoryTimeline({
  history,
  emptyMessage = 'No moderation history',
}: ModerationHistoryTimelineProps) {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'dismiss':
        return <XCircle size={20} color={colors.textSecondary} />;
      case 'warn':
        return <AlertTriangle size={20} color={colors.secondary} />;
      case 'remove_content':
        return <Flag size={20} color={colors.error} />;
      case 'suspend_user':
        return <Ban size={20} color={colors.error} />;
      case 'ban_user':
        return <Shield size={20} color="#DC2626" />;
      default:
        return <Clock size={20} color={colors.textSecondary} />;
    }
  };

  const renderItem = ({ item, index }: { item: UserModerationHistory; index: number }) => {
    const severityColor = getSeverityColor(item.severity);
    const isLast = index === history.length - 1;

    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <View style={[styles.iconContainer, { borderColor: severityColor }]}>
            {getActionIcon(item.action_type)}
          </View>
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        <View style={[styles.timelineCard, isLast && styles.timelineCardLast]}>
          <View style={styles.cardHeader}>
            <Text style={styles.actionType}>{formatActionType(item.action_type)}</Text>
            {item.severity && (
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: severityColor + '20' },
                ]}
              >
                <Text style={[styles.severityText, { color: severityColor }]}>
                  {item.severity}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.reason}>{item.reason}</Text>

          <View style={styles.cardFooter}>
            <Text style={styles.moderator}>by {item.moderator_name}</Text>
            <Text style={styles.contentType}>{item.content_type}</Text>
          </View>

          {item.strike_count > 0 && (
            <View style={styles.strikeContainer}>
              <Text style={styles.strikeText}>
                {item.strike_count} {item.strike_count === 1 ? 'strike' : 'strikes'} issued
              </Text>
            </View>
          )}

          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Shield size={64} color={colors.success} />
      <Text style={styles.emptyTitle}>Clean Record</Text>
      <Text style={styles.emptyDescription}>{emptyMessage}</Text>
    </View>
  );

  if (history.length === 0) {
    return renderEmpty();
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  timelineCardLast: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionType: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  reason: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moderator: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contentType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  strikeContainer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  strikeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
