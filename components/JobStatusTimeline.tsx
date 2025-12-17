import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Circle,
  CheckCircle,
  Clock,
  MessageSquare,
  XCircle,
  AlertCircle,
  Edit,
  FileText,
  RefreshCw,
  PlusCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  JobTimelineEvent,
  formatRelativeTime,
  formatAbsoluteTime,
  getEventColor,
} from '@/lib/job-timeline';

interface JobStatusTimelineProps {
  events: JobTimelineEvent[];
  showAllEvents?: boolean;
}

export default function JobStatusTimeline({
  events,
  showAllEvents = false,
}: JobStatusTimelineProps) {
  const displayEvents = showAllEvents ? events : events.filter((e) => e.is_milestone);

  const getEventIcon = (eventType: string, isMilestone: boolean) => {
    const size = isMilestone ? 24 : 20;
    const color = getEventColor(eventType);

    switch (eventType) {
      case 'created':
        return <PlusCircle size={size} color={color} />;
      case 'status_changed':
        return <RefreshCw size={size} color={color} />;
      case 'quote_received':
        return <MessageSquare size={size} color={color} />;
      case 'quote_accepted':
        return <CheckCircle size={size} color={color} />;
      case 'expired':
        return <Clock size={size} color={color} />;
      case 'cancelled':
        return <XCircle size={size} color={color} />;
      case 'updated':
        return <Edit size={size} color={color} />;
      case 'note':
        return <FileText size={size} color={color} />;
      case 'message':
        return <MessageSquare size={size} color={color} />;
      default:
        return <Circle size={size} color={color} />;
    }
  };

  const renderTimelineItem = (event: JobTimelineEvent, index: number, isLast: boolean) => {
    const eventColor = getEventColor(event.event_type);

    return (
      <View key={event.id} style={styles.timelineItem}>
        <View style={styles.timelineLeftColumn}>
          <View
            style={[
              styles.iconContainer,
              event.is_milestone && styles.iconContainerMilestone,
              { backgroundColor: eventColor + '20' },
            ]}
          >
            {getEventIcon(event.event_type, event.is_milestone)}
          </View>
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        <View style={styles.timelineContent}>
          <View style={styles.eventHeader}>
            <Text
              style={[
                styles.eventTitle,
                event.is_milestone && styles.eventTitleMilestone,
              ]}
            >
              {event.title}
            </Text>
            {event.is_milestone && <View style={styles.milestoneBadge} />}
          </View>

          {event.description && (
            <Text style={styles.eventDescription}>{event.description}</Text>
          )}

          <View style={styles.eventMeta}>
            <Text style={styles.actorText}>
              {event.actor.name}
              <Text style={styles.actorRole}> · {event.actor.role}</Text>
            </Text>
            <Text style={styles.timeText}>{formatRelativeTime(event.timestamp)}</Text>
          </View>

          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <View style={styles.metadataContainer}>
              {Object.entries(event.metadata).map(([key, value]) => {
                if (key === 'from_status' || key === 'to_status') return null;
                return (
                  <View key={key} style={styles.metadataItem}>
                    <Text style={styles.metadataKey}>
                      {key.replace(/_/g, ' ')}:
                    </Text>
                    <Text style={styles.metadataValue}>
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.absoluteTime}>{formatAbsoluteTime(event.timestamp)}</Text>
        </View>
      </View>
    );
  };

  if (displayEvents.length === 0) {
    return (
      <View style={styles.emptyState}>
        <AlertCircle size={48} color={colors.textLight} />
        <Text style={styles.emptyTitle}>No Timeline Events</Text>
        <Text style={styles.emptyText}>
          Timeline events will appear here as the job progresses
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {displayEvents.map((event, index) =>
        renderTimelineItem(event, index, index === displayEvents.length - 1)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  iconContainerMilestone: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  eventTitleMilestone: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  milestoneBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  eventDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actorText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  actorRole: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  absoluteTime: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  metadataContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  metadataItem: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metadataKey: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  metadataValue: {
    fontSize: fontSize.xs,
    color: colors.text,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
