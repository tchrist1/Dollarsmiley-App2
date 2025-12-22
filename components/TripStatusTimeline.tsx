import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Circle,
  CheckCircle,
  Car,
  Navigation,
  MapPin,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface TripTimelineEvent {
  status: 'not_started' | 'on_the_way' | 'arriving_soon' | 'arrived' | 'completed' | 'canceled';
  timestamp?: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface TripStatusTimelineProps {
  currentStatus: string;
  startedAt?: string;
  arrivingSoonAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  legNumber?: number;
  totalLegs?: number;
}

const TIMELINE_STEPS = [
  {
    status: 'not_started',
    label: 'Waiting to Start',
    icon: Circle,
  },
  {
    status: 'on_the_way',
    label: 'On the Way',
    icon: Car,
  },
  {
    status: 'arriving_soon',
    label: 'Arriving Soon',
    icon: Navigation,
  },
  {
    status: 'arrived',
    label: 'Arrived',
    icon: MapPin,
  },
  {
    status: 'completed',
    label: 'Completed',
    icon: CheckCircle,
  },
];

export default function TripStatusTimeline({
  currentStatus,
  startedAt,
  arrivingSoonAt,
  arrivedAt,
  completedAt,
  canceledAt,
  legNumber,
  totalLegs,
}: TripStatusTimelineProps) {
  const isCanceled = currentStatus === 'canceled';

  const getStatusIndex = (status: string): number => {
    return TIMELINE_STEPS.findIndex(step => step.status === status);
  };

  const currentIndex = getStatusIndex(currentStatus);

  const formatTime = (isoString?: string): string | null => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimestamp = (status: string): string | null => {
    switch (status) {
      case 'on_the_way': return formatTime(startedAt);
      case 'arriving_soon': return formatTime(arrivingSoonAt);
      case 'arrived': return formatTime(arrivedAt);
      case 'completed': return formatTime(completedAt);
      default: return null;
    }
  };

  if (isCanceled) {
    return (
      <View style={styles.container}>
        {legNumber && totalLegs && totalLegs > 1 && (
          <View style={styles.legHeader}>
            <Text style={styles.legLabel}>
              Leg {legNumber} of {totalLegs}
            </Text>
          </View>
        )}

        <View style={styles.canceledContainer}>
          <AlertCircle size={40} color={colors.error} />
          <Text style={styles.canceledTitle}>Trip Canceled</Text>
          {canceledAt && (
            <Text style={styles.canceledTime}>
              Canceled at {formatTime(canceledAt)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {legNumber && totalLegs && totalLegs > 1 && (
        <View style={styles.legHeader}>
          <Text style={styles.legLabel}>
            Leg {legNumber} of {totalLegs}
          </Text>
        </View>
      )}

      <View style={styles.timeline}>
        {TIMELINE_STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;
          const timestamp = getTimestamp(step.status);

          return (
            <View key={step.status} style={styles.timelineStep}>
              <View style={styles.stepLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    isCompleted && styles.iconContainerCompleted,
                    isActive && styles.iconContainerActive,
                    isPending && styles.iconContainerPending,
                  ]}
                >
                  {isCompleted ? (
                    <CheckCircle size={20} color={colors.white} />
                  ) : (
                    <StepIcon
                      size={20}
                      color={isActive ? colors.white : colors.gray400}
                    />
                  )}
                </View>
                {index < TIMELINE_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.connector,
                      isCompleted && styles.connectorCompleted,
                    ]}
                  />
                )}
              </View>

              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isActive && styles.stepLabelActive,
                    isPending && styles.stepLabelPending,
                  ]}
                >
                  {step.label}
                </Text>
                {timestamp && (
                  <View style={styles.timestampContainer}>
                    <Clock size={12} color={colors.textSecondary} />
                    <Text style={styles.timestamp}>{timestamp}</Text>
                  </View>
                )}
                {isActive && !timestamp && (
                  <View style={styles.activeIndicator}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>In progress</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function CompactTripTimeline({
  currentStatus,
  legNumber,
  totalLegs,
}: Pick<TripStatusTimelineProps, 'currentStatus' | 'legNumber' | 'totalLegs'>) {
  const currentIndex = TIMELINE_STEPS.findIndex(step => step.status === currentStatus);
  const isCanceled = currentStatus === 'canceled';

  if (isCanceled) {
    return (
      <View style={styles.compactContainer}>
        <AlertCircle size={16} color={colors.error} />
        <Text style={styles.compactCanceledText}>Trip Canceled</Text>
      </View>
    );
  }

  return (
    <View style={styles.compactContainer}>
      {legNumber && totalLegs && totalLegs > 1 && (
        <Text style={styles.compactLegText}>
          {legNumber}/{totalLegs}
        </Text>
      )}

      <View style={styles.compactDots}>
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <View
              key={step.status}
              style={[
                styles.compactDot,
                isCompleted && styles.compactDotCompleted,
                isActive && styles.compactDotActive,
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.compactStatusText}>
        {TIMELINE_STEPS[currentIndex]?.label || 'Unknown'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  legHeader: {
    marginBottom: spacing.md,
  },
  legLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  timeline: {
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 60,
  },
  stepLeft: {
    alignItems: 'center',
    width: 40,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    borderWidth: 2,
    borderColor: colors.gray200,
  },
  iconContainerCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  iconContainerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconContainerPending: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.xs,
  },
  connectorCompleted: {
    backgroundColor: colors.success,
  },
  stepContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingTop: spacing.xs,
  },
  stepLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.gray400,
  },
  stepLabelCompleted: {
    color: colors.success,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  stepLabelPending: {
    color: colors.gray400,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  activeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  canceledContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  canceledTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginTop: spacing.md,
  },
  canceledTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactLegText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  compactDots: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray200,
  },
  compactDotCompleted: {
    backgroundColor: colors.success,
  },
  compactDotActive: {
    backgroundColor: colors.primary,
  },
  compactStatusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  compactCanceledText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
});
