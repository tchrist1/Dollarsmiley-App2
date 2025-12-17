import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowUpCircle,
  Briefcase,
  List,
  Star,
  Calendar,
  MessageSquare,
  Code,
  HardDrive,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  getUserUsageSummary,
  getMetricLabel,
  formatUsageCount,
  shouldShowUsageWarning,
  getUsageColor,
  type UsageMetric,
  type UsageSummary,
  type UsageData,
} from '@/lib/usage-tracking';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface UsageTrackerProps {
  userId: string;
  compact?: boolean;
  showUpgrade?: boolean;
  onUpgradePress?: () => void;
}

export default function UsageTracker({
  userId,
  compact = false,
  showUpgrade = true,
  onUpgradePress,
}: UsageTrackerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UsageSummary | null>(null);

  useEffect(() => {
    loadUsage();
  }, [userId]);

  const loadUsage = async () => {
    setLoading(true);
    try {
      const data = await getUserUsageSummary(userId);
      setSummary(data);
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (metric: UsageMetric, size: number = 20, color: string = colors.textSecondary) => {
    switch (metric) {
      case 'job_posts':
        return <Briefcase size={size} color={color} />;
      case 'listings':
        return <List size={size} color={color} />;
      case 'featured_listings':
        return <Star size={size} color={color} />;
      case 'bookings':
        return <Calendar size={size} color={color} />;
      case 'messages':
        return <MessageSquare size={size} color={color} />;
      case 'api_calls':
        return <Code size={size} color={color} />;
      case 'storage_mb':
        return <HardDrive size={size} color={color} />;
      case 'team_seats':
        return <Users size={size} color={color} />;
      default:
        return <TrendingUp size={size} color={color} />;
    }
  };

  const handleUpgrade = () => {
    if (onUpgradePress) {
      onUpgradePress();
    } else {
      router.push('/subscription');
    }
  };

  const renderUsageBar = (usage: UsageData) => {
    const percentage = Math.min(usage.percentage, 100);
    const showWarning = shouldShowUsageWarning(percentage);
    const barColor = getUsageColor(percentage);

    return (
      <View style={styles.usageItem}>
        <View style={styles.usageHeader}>
          <View style={styles.usageInfo}>
            {getMetricIcon(usage.metric, 20, colors.textSecondary)}
            <Text style={styles.usageLabel}>{getMetricLabel(usage.metric)}</Text>
          </View>
          <View style={styles.usageStats}>
            <Text style={styles.usageCount}>
              {formatUsageCount(usage.metric, usage.count)}
            </Text>
            {!usage.unlimited && (
              <>
                <Text style={styles.usageSeparator}>/</Text>
                <Text style={styles.usageLimit}>
                  {formatUsageCount(usage.metric, usage.limit)}
                </Text>
              </>
            )}
            {usage.unlimited && (
              <Text style={styles.usageUnlimited}>∞</Text>
            )}
          </View>
        </View>

        {!usage.unlimited && (
          <>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${percentage}%`, backgroundColor: barColor },
                ]}
              />
            </View>

            {showWarning && !usage.exceeded && (
              <View style={styles.warningBadge}>
                <AlertTriangle size={14} color={colors.warning} />
                <Text style={styles.warningText}>
                  {usage.remaining} remaining
                </Text>
              </View>
            )}

            {usage.exceeded && (
              <View style={styles.exceededBadge}>
                <AlertTriangle size={14} color={colors.error} />
                <Text style={styles.exceededText}>Limit reached</Text>
              </View>
            )}
          </>
        )}

        {usage.unlimited && (
          <View style={styles.unlimitedBadge}>
            <CheckCircle size={14} color={colors.success} />
            <Text style={styles.unlimitedText}>Unlimited</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCompact = () => {
    if (!summary) return null;

    const criticalUsage = summary.usage.filter(
      (u) => !u.unlimited && u.percentage >= 80
    );

    if (criticalUsage.length === 0) {
      return (
        <View style={styles.compactContainer}>
          <CheckCircle size={20} color={colors.success} />
          <Text style={styles.compactText}>All limits OK</Text>
        </View>
      );
    }

    return (
      <View style={styles.compactContainer}>
        <AlertTriangle size={20} color={colors.warning} />
        <Text style={styles.compactText}>
          {criticalUsage.length} limit{criticalUsage.length > 1 ? 's' : ''} approaching
        </Text>
        <TouchableOpacity
          style={styles.compactButton}
          onPress={() => router.push('/settings/usage')}
        >
          <Text style={styles.compactButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading usage...</Text>
      </View>
    );
  }

  if (!summary) {
    return null;
  }

  if (compact) {
    return renderCompact();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Usage This Month</Text>
        <Text style={styles.subtitle}>
          {new Date(summary.periodStart).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}{' '}
          -{' '}
          {new Date(summary.periodEnd).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.planBadge}>
        <Text style={styles.planText}>{summary.plan.display_name} Plan</Text>
      </View>

      <ScrollView
        style={styles.usageList}
        showsVerticalScrollIndicator={false}
      >
        {summary.usage
          .filter((u) => u.limit !== 0 || u.count > 0)
          .map((usage) => (
            <View key={usage.metric}>{renderUsageBar(usage)}</View>
          ))}
      </ScrollView>

      {summary.hasExceeded && showUpgrade && (
        <View style={styles.upgradeSection}>
          <View style={styles.upgradeContent}>
            <AlertTriangle size={24} color={colors.warning} />
            <View style={styles.upgradeText}>
              <Text style={styles.upgradeTitle}>Limit Reached</Text>
              <Text style={styles.upgradeDescription}>
                Upgrade to increase your limits
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
            <ArrowUpCircle size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  compactText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  compactButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  compactButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  planText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  usageList: {
    maxHeight: 400,
  },
  usageItem: {
    marginBottom: spacing.lg,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  usageLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  usageCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  usageSeparator: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  usageLimit: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  usageUnlimited: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  warningText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  exceededBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  exceededText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  unlimitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  unlimitedText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  upgradeSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  upgradeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  upgradeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
