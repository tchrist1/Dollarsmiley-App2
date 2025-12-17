import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Circle,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  Star,
  XCircle,
  AlertCircle,
  MessageSquare,
  User,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export interface TimelineEvent {
  id: string;
  type:
    | 'created'
    | 'accepted'
    | 'confirmed'
    | 'payment_pending'
    | 'payment_completed'
    | 'in_progress'
    | 'completed'
    | 'reviewed'
    | 'cancelled'
    | 'declined'
    | 'rescheduled'
    | 'disputed'
    | 'message';
  title: string;
  description?: string;
  timestamp: string;
  actor?: {
    name: string;
    role: 'customer' | 'provider' | 'system';
  };
  metadata?: Record<string, any>;
}

interface BookingTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
  compact?: boolean;
}

const EVENT_ICONS = {
  created: Calendar,
  accepted: CheckCircle,
  confirmed: CheckCircle,
  payment_pending: Clock,
  payment_completed: DollarSign,
  in_progress: Clock,
  completed: CheckCircle,
  reviewed: Star,
  cancelled: XCircle,
  declined: XCircle,
  rescheduled: Calendar,
  disputed: AlertCircle,
  message: MessageSquare,
};

const EVENT_COLORS = {
  created: colors.info,
  accepted: colors.success,
  confirmed: colors.success,
  payment_pending: colors.warning,
  payment_completed: colors.success,
  in_progress: colors.primary,
  completed: colors.success,
  reviewed: colors.warning,
  cancelled: colors.error,
  declined: colors.error,
  rescheduled: colors.info,
  disputed: colors.error,
  message: colors.textSecondary,
};

const ROLE_ICONS = {
  customer: User,
  provider: User,
  system: Circle,
};

export function BookingTimeline({
  events,
  currentStatus,
  compact = false,
}: BookingTimelineProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatFullTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isEventActive = (event: TimelineEvent, index: number) => {
    return index === events.length - 1;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>Booking Timeline</Text>
          <Text style={styles.compactStatus}>{currentStatus}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.compactTimeline}>
            {events.map((event, index) => {
              const Icon = EVENT_ICONS[event.type] || Circle;
              const color = EVENT_COLORS[event.type] || colors.textSecondary;
              const isActive = isEventActive(event, index);
              const isLast = index === events.length - 1;

              return (
                <View key={event.id} style={styles.compactEventContainer}>
                  <View style={styles.compactEventDot}>
                    <View
                      style={[
                        styles.compactDot,
                        { backgroundColor: color },
                        isActive && styles.compactDotActive,
                      ]}
                    >
                      <Icon size={12} color={colors.white} strokeWidth={3} />
                    </View>
                    {!isLast && <View style={[styles.compactLine, { backgroundColor: color }]} />}
                  </View>
                  <Text style={styles.compactEventTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.compactEventTime}>{formatTime(event.timestamp)}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Booking Timeline</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{currentStatus}</Text>
        </View>
      </View>

      <View style={styles.timelineContainer}>
        {events.map((event, index) => {
          const Icon = EVENT_ICONS[event.type] || Circle;
          const color = EVENT_COLORS[event.type] || colors.textSecondary;
          const isActive = isEventActive(event, index);
          const isLast = index === events.length - 1;
          const ActorIcon = event.actor ? ROLE_ICONS[event.actor.role] : null;

          return (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: color },
                    isActive && styles.dotActive,
                  ]}
                >
                  <Icon
                    size={isActive ? 20 : 16}
                    color={colors.white}
                    strokeWidth={isActive ? 3 : 2}
                  />
                </View>
                {!isLast && (
                  <View style={[styles.line, { backgroundColor: color + '30' }]} />
                )}
              </View>

              <View style={[styles.eventCard, isActive && styles.eventCardActive]}>
                <View style={styles.eventHeader}>
                  <Text style={[styles.eventTitle, isActive && styles.eventTitleActive]}>
                    {event.title}
                  </Text>
                  <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
                </View>

                {event.description && (
                  <Text style={styles.eventDescription}>{event.description}</Text>
                )}

                {event.actor && (
                  <View style={styles.actorContainer}>
                    {ActorIcon && <ActorIcon size={14} color={colors.textSecondary} />}
                    <Text style={styles.actorText}>
                      {event.actor.name}
                      {event.actor.role !== 'system' && (
                        <Text style={styles.actorRole}> · {event.actor.role}</Text>
                      )}
                    </Text>
                  </View>
                )}

                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <View style={styles.metadataContainer}>
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <View key={key} style={styles.metadataItem}>
                        <Text style={styles.metadataKey}>{key}:</Text>
                        <Text style={styles.metadataValue}>{String(value)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.eventFullTime}>{formatFullTime(event.timestamp)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {events.length} event{events.length !== 1 ? 's' : ''} in timeline
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  timelineContainer: {
    padding: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  timelineDot: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dotActive: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  line: {
    width: 3,
    flex: 1,
    marginTop: spacing.xs,
  },
  eventCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  eventTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  eventTitleActive: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  eventTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  eventDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: spacing.sm,
  },
  actorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actorText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actorRole: {
    textTransform: 'capitalize',
    fontWeight: fontWeight.medium,
  },
  metadataContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  metadataItem: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
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
  },
  eventFullTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  compactContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  compactTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  compactStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
  },
  compactTimeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  compactEventContainer: {
    alignItems: 'center',
    marginRight: spacing.lg,
    width: 80,
  },
  compactEventDot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  compactDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compactDotActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
  },
  compactLine: {
    width: 40,
    height: 2,
    marginLeft: spacing.xs,
  },
  compactEventTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  compactEventTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
