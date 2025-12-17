import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { PerformanceTrend } from '@/lib/job-analytics';

interface JobPerformanceChartProps {
  trends: PerformanceTrend[];
  metric: 'views' | 'quotes' | 'conversions';
  title: string;
}

const { width } = Dimensions.get('window');
const chartWidth = width - spacing.lg * 4;

export default function JobPerformanceChart({
  trends,
  metric,
  title,
}: JobPerformanceChartProps) {
  if (trends.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available yet</Text>
          <Text style={styles.emptySubtext}>
            Post more jobs to see performance trends
          </Text>
        </View>
      </View>
    );
  }

  const labels = trends.map((t) =>
    new Date(t.metric_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  );

  const getData = () => {
    switch (metric) {
      case 'views':
        return trends.map((t) => t.total_views);
      case 'quotes':
        return trends.map((t) => t.total_quotes);
      case 'conversions':
        return trends.map((t) => t.conversions);
      default:
        return trends.map((t) => t.total_views);
    }
  };

  const data = getData();
  const maxValue = Math.max(...data, 1);

  const chartData = {
    labels: labels.length > 7 ? labels.filter((_, i) => i % 2 === 0) : labels,
    datasets: [
      {
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => {
          switch (metric) {
            case 'views':
              return `rgba(59, 130, 246, ${opacity})`;
            case 'quotes':
              return `rgba(245, 158, 11, ${opacity})`;
            case 'conversions':
              return `rgba(16, 185, 129, ${opacity})`;
            default:
              return `rgba(59, 130, 246, ${opacity})`;
          }
        },
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => {
      switch (metric) {
        case 'views':
          return `rgba(59, 130, 246, ${opacity})`;
        case 'quotes':
          return `rgba(245, 158, 11, ${opacity})`;
        case 'conversions':
          return `rgba(16, 185, 129, ${opacity})`;
        default:
          return `rgba(59, 130, 246, ${opacity})`;
      }
    },
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`,
    style: {
      borderRadius: borderRadius.md,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.white,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  const total = data.reduce((sum, val) => sum + val, 0);
  const average = data.length > 0 ? total / data.length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{total}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={styles.statValue}>{average.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines
          withOuterLines
          withVerticalLines={false}
          withHorizontalLines
          withVerticalLabels
          withHorizontalLabels
          fromZero
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  chartContainer: {
    alignItems: 'center',
    marginLeft: -spacing.md,
  },
  chart: {
    borderRadius: borderRadius.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
});
