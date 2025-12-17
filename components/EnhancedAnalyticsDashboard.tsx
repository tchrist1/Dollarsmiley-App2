import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { TrendingUp, TrendingDown, Users, Activity, Clock, Target } from 'lucide-react-native';
import {
  getEngagementTrends,
  getTopEvents,
  getDAUMAURatio,
  getSessionDurationTrends,
  getEventDistribution,
  type EngagementTrend,
  type TopEvent,
  type ChartData,
  type DistributionData,
} from '@/lib/analytics';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

interface EnhancedAnalyticsDashboardProps {
  userId?: string;
  isAdmin?: boolean;
}

export default function EnhancedAnalyticsDashboard({
  userId,
  isAdmin = false,
}: EnhancedAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);
  const [engagementTrends, setEngagementTrends] = useState<EngagementTrend[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [dauData, setDAUData] = useState<ChartData>({ labels: [], datasets: [{ data: [] }] });
  const [sessionData, setSessionData] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [eventDistribution, setEventDistribution] = useState<DistributionData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [trends, events, dau, session, distribution] = await Promise.all([
        getEngagementTrends(dateRange),
        getTopEvents(dateRange, 5),
        getDAUMAURatio(dateRange),
        getSessionDurationTrends(dateRange),
        getEventDistribution(dateRange),
      ]);

      setEngagementTrends(trends);
      setTopEvents(events);
      setDAUData(dau);
      setSessionData(session);
      setEventDistribution(distribution);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverallStats = () => {
    if (engagementTrends.length === 0) return null;

    const totalDAU = engagementTrends.reduce((sum, t) => sum + t.dau, 0);
    const avgDAU = Math.round(totalDAU / engagementTrends.length);
    const totalSessions = engagementTrends.reduce((sum, t) => sum + t.total_sessions, 0);
    const avgSessionDuration =
      engagementTrends.reduce((sum, t) => sum + Number(t.avg_session_duration), 0) /
      engagementTrends.length;

    const latestDAU = engagementTrends[engagementTrends.length - 1]?.dau || 0;
    const previousDAU = engagementTrends[engagementTrends.length - 2]?.dau || 0;
    const dauChange = previousDAU > 0 ? ((latestDAU - previousDAU) / previousDAU) * 100 : 0;

    return {
      avgDAU,
      totalSessions,
      avgSessionDuration: avgSessionDuration.toFixed(1),
      dauChange: dauChange.toFixed(1),
    };
  };

  const stats = getOverallStats();

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        {([7, 30, 90] as const).map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.dateButton, dateRange === days && styles.dateButtonActive]}
            onPress={() => setDateRange(days)}
          >
            <Text
              style={[
                styles.dateButtonText,
                dateRange === days && styles.dateButtonTextActive,
              ]}
            >
              {days}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Stats */}
      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users size={24} color={colors.primary} />
            <Text style={styles.statValue}>{stats.avgDAU}</Text>
            <Text style={styles.statLabel}>Avg Daily Users</Text>
            <View style={styles.statChange}>
              {Number(stats.dauChange) >= 0 ? (
                <TrendingUp size={14} color={colors.success} />
              ) : (
                <TrendingDown size={14} color={colors.error} />
              )}
              <Text
                style={[
                  styles.statChangeText,
                  {
                    color: Number(stats.dauChange) >= 0 ? colors.success : colors.error,
                  },
                ]}
              >
                {Math.abs(Number(stats.dauChange))}%
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Activity size={24} color={colors.secondary} />
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>

          <View style={styles.statCard}>
            <Clock size={24} color={colors.success} />
            <Text style={styles.statValue}>{stats.avgSessionDuration}</Text>
            <Text style={styles.statLabel}>Avg Session (min)</Text>
          </View>

          <View style={styles.statCard}>
            <Target size={24} color={colors.error} />
            <Text style={styles.statValue}>{topEvents[0]?.event_count || 0}</Text>
            <Text style={styles.statLabel}>Top Activity</Text>
          </View>
        </View>
      )}

      {/* DAU Chart */}
      {dauData.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Daily Active Users</Text>
          <LineChart
            data={{
              labels: dauData.labels.slice(-7),
              datasets: [
                {
                  data: dauData.datasets[0].data.slice(-7),
                  color: () => colors.primary,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Session Duration Chart */}
      {sessionData.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Avg Session Duration (minutes)</Text>
          <LineChart
            data={{
              labels: sessionData.labels.slice(-7),
              datasets: [
                {
                  data: sessionData.datasets[0].data.slice(-7),
                  color: () => colors.success,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Event Distribution */}
      {eventDistribution.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Event Distribution</Text>
          <PieChart
            data={eventDistribution}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={chartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}

      {/* Top Events List */}
      {topEvents.length > 0 && (
        <View style={styles.eventsList}>
          <Text style={styles.listTitle}>Top Activities</Text>
          {topEvents.map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <View style={styles.eventRank}>
                <Text style={styles.eventRankText}>{index + 1}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>
                  {event.event_type
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')}
                </Text>
                <Text style={styles.eventUsers}>{event.unique_users} users</Text>
              </View>
              <Text style={styles.eventCount}>{event.event_count}</Text>
            </View>
          ))}
        </View>
      )}
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
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.md,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
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
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChangeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  eventsList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  eventRankText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  eventUsers: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  eventCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
