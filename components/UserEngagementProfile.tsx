import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Activity,
  Clock,
  Eye,
  Search,
  MessageSquare,
  FileText,
  Heart,
  TrendingUp,
} from 'lucide-react-native';
import {
  getUserEngagementSummary,
  type UserEngagementSummary,
} from '@/lib/analytics';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface UserEngagementProfileProps {
  userId: string;
  dateRange?: number;
}

export default function UserEngagementProfile({
  userId,
  dateRange = 30,
}: UserEngagementProfileProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UserEngagementSummary | null>(null);
  const [selectedRange, setSelectedRange] = useState(dateRange);

  useEffect(() => {
    loadEngagementData();
  }, [userId, selectedRange]);

  const loadEngagementData = async () => {
    setLoading(true);
    try {
      const data = await getUserEngagementSummary(userId, selectedRange);
      setSummary(data);
    } catch (error) {
      console.error('Error loading engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getEngagementScore = (): number => {
    if (!summary) return 0;

    const {
      total_sessions,
      total_pages_viewed,
      total_bookings,
      total_interactions,
      active_days,
    } = summary;

    const sessionScore = Math.min((total_sessions / 30) * 20, 20);
    const pageScore = Math.min((total_pages_viewed / 100) * 20, 20);
    const bookingScore = Math.min((total_bookings / 5) * 20, 20);
    const interactionScore = Math.min((total_interactions / 50) * 20, 20);
    const activityScore = Math.min((active_days / selectedRange) * 20, 20);

    return Math.round(
      sessionScore + pageScore + bookingScore + interactionScore + activityScore
    );
  };

  const getEngagementLevel = (score: number): string => {
    if (score >= 80) return 'Highly Engaged';
    if (score >= 60) return 'Active';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Low';
    return 'Inactive';
  };

  const getEngagementColor = (score: number): string => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.primary;
    if (score >= 40) return colors.secondary;
    return colors.error;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <Activity size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No engagement data available</Text>
      </View>
    );
  }

  const engagementScore = getEngagementScore();
  const engagementLevel = getEngagementLevel(engagementScore);
  const engagementColor = getEngagementColor(engagementScore);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        {[7, 30, 90].map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.dateButton,
              selectedRange === days && styles.dateButtonActive,
            ]}
            onPress={() => setSelectedRange(days)}
          >
            <Text
              style={[
                styles.dateButtonText,
                selectedRange === days && styles.dateButtonTextActive,
              ]}
            >
              {days}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Engagement Score */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreValue, { color: engagementColor }]}>
            {engagementScore}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreTitle}>Engagement Score</Text>
          <Text style={[styles.scoreLevel, { color: engagementColor }]}>
            {engagementLevel}
          </Text>
        </View>
        <TrendingUp size={32} color={engagementColor} />
      </View>

      {/* Summary Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Activity size={24} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{summary.total_sessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
            <Clock size={24} color={colors.success} />
          </View>
          <Text style={styles.statValue}>
            {formatDuration(summary.avg_session_duration)}
          </Text>
          <Text style={styles.statLabel}>Avg Duration</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
            <Eye size={24} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>{summary.total_pages_viewed}</Text>
          <Text style={styles.statLabel}>Pages Viewed</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.error + '20' }]}>
            <Search size={24} color={colors.error} />
          </View>
          <Text style={styles.statValue}>{summary.total_searches}</Text>
          <Text style={styles.statLabel}>Searches</Text>
        </View>
      </View>

      {/* Activity Breakdown */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Activity Breakdown</Text>

        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Eye size={20} color={colors.primary} />
            <Text style={styles.activityLabel}>Listings Viewed</Text>
            <Text style={styles.activityValue}>{summary.total_listings_viewed}</Text>
          </View>

          <View style={styles.activityItem}>
            <FileText size={20} color={colors.success} />
            <Text style={styles.activityLabel}>Bookings Made</Text>
            <Text style={styles.activityValue}>{summary.total_bookings}</Text>
          </View>

          <View style={styles.activityItem}>
            <MessageSquare size={20} color={colors.secondary} />
            <Text style={styles.activityLabel}>Messages Sent</Text>
            <Text style={styles.activityValue}>{summary.total_messages}</Text>
          </View>

          <View style={styles.activityItem}>
            <FileText size={20} color={colors.error} />
            <Text style={styles.activityLabel}>Posts Created</Text>
            <Text style={styles.activityValue}>{summary.total_posts}</Text>
          </View>

          <View style={styles.activityItem}>
            <Heart size={20} color='#FF3B30' />
            <Text style={styles.activityLabel}>Interactions</Text>
            <Text style={styles.activityValue}>{summary.total_interactions}</Text>
          </View>
        </View>
      </View>

      {/* Time Stats */}
      <View style={styles.timeSection}>
        <Text style={styles.sectionTitle}>Time & Frequency</Text>

        <View style={styles.timeStats}>
          <View style={styles.timeStat}>
            <Text style={styles.timeValue}>{summary.active_days}</Text>
            <Text style={styles.timeLabel}>Active Days</Text>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeStat}>
            <Text style={styles.timeValue}>
              {formatDuration(summary.total_time_minutes)}
            </Text>
            <Text style={styles.timeLabel}>Total Time</Text>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeStat}>
            <Text style={styles.timeValue}>
              {new Date(summary.last_active).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.timeLabel}>Last Active</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dateButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dateButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  dateButtonTextActive: {
    color: colors.white,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
  },
  scoreMax: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoreLevel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activitySection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  activityList: {
    gap: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  activityValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timeSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeStat: {
    flex: 1,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
});
