import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import JobAnalyticsOverview from '@/components/JobAnalyticsOverview';
import JobPerformanceChart from '@/components/JobPerformanceChart';
import JobInsightsCard from '@/components/JobInsightsCard';
import {
  getUserJobAnalyticsSummary,
  getJobPerformanceTrends,
  JobAnalyticsSummary,
  PerformanceTrend,
} from '@/lib/job-analytics';

export default function JobAnalyticsScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30);
  const [analytics, setAnalytics] = useState<JobAnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);

  useEffect(() => {
    if (profile) {
      loadAnalytics();
    }
  }, [profile, timeRange]);

  const loadAnalytics = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const [analyticsData, trendsData] = await Promise.all([
        getUserJobAnalyticsSummary(profile.id, timeRange),
        getJobPerformanceTrends(profile.id, timeRange),
      ]);

      setAnalytics(analyticsData);
      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {[30, 60, 90].map((days) => (
        <TouchableOpacity
          key={days}
          style={[
            styles.timeRangeButton,
            timeRange === days && styles.timeRangeButtonActive,
          ]}
          onPress={() => setTimeRange(days as 30 | 60 | 90)}
        >
          <Text
            style={[
              styles.timeRangeText,
              timeRange === days && styles.timeRangeTextActive,
            ]}
          >
            {days} days
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Analytics</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Analytics</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.emptyState}>
          <Calendar size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Analytics Available</Text>
          <Text style={styles.emptyText}>
            Post some jobs to start tracking your performance metrics
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Analytics</Text>
        <View style={styles.backButton} />
      </View>

      {renderTimeRangeSelector()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <JobAnalyticsOverview analytics={analytics} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Trends</Text>
          <JobPerformanceChart
            trends={trends}
            metric="views"
            title="Views Over Time"
          />
        </View>

        <View style={styles.section}>
          <JobPerformanceChart
            trends={trends}
            metric="quotes"
            title="Quotes Received"
          />
        </View>

        <View style={styles.section}>
          <JobPerformanceChart
            trends={trends}
            metric="conversions"
            title="Conversions"
          />
        </View>

        <View style={styles.section}>
          <JobInsightsCard analytics={analytics} />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  timeRangeTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
