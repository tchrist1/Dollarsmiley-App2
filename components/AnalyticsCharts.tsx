import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import type { ChartData, DistributionData } from '@/lib/analytics';

const screenWidth = Dimensions.get('window').width;

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        {subtitle && <Text style={styles.chartSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

interface LineChartCardProps {
  title: string;
  subtitle?: string;
  data: ChartData;
  yAxisSuffix?: string;
  yAxisLabel?: string;
  color?: string;
}

export function LineChartCard({
  title,
  subtitle,
  data,
  yAxisSuffix = '',
  yAxisLabel = '',
  color = colors.primary,
}: LineChartCardProps) {
  if (!data.labels.length || !data.datasets[0].data.length) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No data available</Text>
        </View>
      </ChartCard>
    );
  }

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: color,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{
            labels: data.labels,
            datasets: data.datasets,
          }}
          width={Math.max(screenWidth - spacing.lg * 4, data.labels.length * 50)}
          height={220}
          chartConfig={chartConfig}
          bezier
          yAxisSuffix={yAxisSuffix}
          yAxisLabel={yAxisLabel}
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
        />
      </ScrollView>
    </ChartCard>
  );
}

interface BarChartCardProps {
  title: string;
  subtitle?: string;
  data: ChartData;
  yAxisSuffix?: string;
  showValuesOnTopOfBars?: boolean;
}

export function BarChartCard({
  title,
  subtitle,
  data,
  yAxisSuffix = '',
  showValuesOnTopOfBars = false,
}: BarChartCardProps) {
  if (!data.labels.length || !data.datasets[0].data.length) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No data available</Text>
        </View>
      </ChartCard>
    );
  }

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={{
            labels: data.labels,
            datasets: data.datasets,
          }}
          width={Math.max(screenWidth - spacing.lg * 4, data.labels.length * 60)}
          height={220}
          chartConfig={chartConfig}
          yAxisSuffix={yAxisSuffix}
          style={styles.chart}
          withInnerLines={true}
          showValuesOnTopOfBars={showValuesOnTopOfBars}
          fromZero={true}
          showBarTops={false}
        />
      </ScrollView>
    </ChartCard>
  );
}

interface PieChartCardProps {
  title: string;
  subtitle?: string;
  data: DistributionData[];
}

export function PieChartCard({ title, subtitle, data }: PieChartCardProps) {
  if (!data.length) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No data available</Text>
        </View>
      </ChartCard>
    );
  }

  const chartConfig = {
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <View style={styles.pieChartContainer}>
        <PieChart
          data={data}
          width={screenWidth - spacing.lg * 4}
          height={220}
          chartConfig={chartConfig}
          accessor="value"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>
    </ChartCard>
  );
}

interface MultiLineChartCardProps {
  title: string;
  subtitle?: string;
  data: ChartData;
  legends: string[];
  colors?: string[];
  yAxisSuffix?: string;
}

export function MultiLineChartCard({
  title,
  subtitle,
  data,
  legends,
  colors: lineColors = [colors.primary, colors.success],
  yAxisSuffix = '',
}: MultiLineChartCardProps) {
  if (!data.labels.length || !data.datasets[0].data.length) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No data available</Text>
        </View>
      </ChartCard>
    );
  }

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  const enhancedData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      color: () => lineColors[index] || colors.primary,
      strokeWidth: 2,
    })),
    legend: legends,
  };

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={enhancedData}
          width={Math.max(screenWidth - spacing.lg * 4, data.labels.length * 50)}
          height={220}
          chartConfig={chartConfig}
          bezier
          yAxisSuffix={yAxisSuffix}
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          fromZero={true}
        />
      </ScrollView>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  chartHeader: {
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  chartSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chart: {
    borderRadius: borderRadius.md,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  emptyChartText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  pieChartContainer: {
    alignItems: 'center',
  },
});
