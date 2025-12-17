import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { getUsageStats, getUpgradeSuggestions } from '@/lib/subscriptions';

interface SubscriptionUsageTrackerProps {
  userId: string;
  onUpgradePress?: () => void;
}

export default function SubscriptionUsageTracker({
  userId,
  onUpgradePress,
}: SubscriptionUsageTrackerProps) {
  const [stats, setStats] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, [userId]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const [usageStats, upgradeSuggestions] = await Promise.all([
        getUsageStats(userId),
        getUpgradeSuggestions(userId),
      ]);

      setStats(usageStats);
      setSuggestions(upgradeSuggestions);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return null;
  }

  const renderProgressBar = (used: number, limit: number, label: string) => {
    const isUnlimited = limit === -1;
    const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
    const isNearLimit = percentage >= 80;
    const isOverLimit = percentage >= 100;

    return (
      <View style={styles.usageItem}>
        <View style={styles.usageHeader}>
          <Text style={styles.usageLabel}>{label}</Text>
          <Text style={styles.usageText}>
            {used} {isUnlimited ? '' : `/ ${limit === -1 ? '∞' : limit}`}
          </Text>
        </View>

        {!isUnlimited && (
          <>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: isOverLimit
                      ? colors.error
                      : isNearLimit
                      ? colors.warning
                      : colors.success,
                  },
                ]}
              />
            </View>

            {isNearLimit && (
              <View style={styles.warningContainer}>
                <AlertCircle
                  size={14}
                  color={isOverLimit ? colors.error : colors.warning}
                />
                <Text
                  style={[
                    styles.warningText,
                    { color: isOverLimit ? colors.error : colors.warning },
                  ]}
                >
                  {isOverLimit
                    ? 'Limit reached'
                    : `${Math.round(percentage)}% of limit used`}
                </Text>
              </View>
            )}
          </>
        )}

        {isUnlimited && (
          <View style={styles.unlimitedBadge}>
            <Text style={styles.unlimitedText}>Unlimited</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Usage This Month</Text>
        {suggestions.length > 0 && onUpgradePress && (
          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgradePress}>
            <TrendingUp size={16} color={colors.primary} />
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.usageContainer}>
        {renderProgressBar(stats.listings.used, stats.listings.limit, 'Listings')}
        {renderProgressBar(stats.jobs.used, stats.jobs.limit, 'Job Posts')}
        {renderProgressBar(stats.featured.used, stats.featured.limit, 'Featured Listings')}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <View
              key={index}
              style={[
                styles.suggestionCard,
                {
                  borderLeftColor:
                    suggestion.severity === 'high'
                      ? colors.error
                      : suggestion.severity === 'medium'
                      ? colors.warning
                      : colors.primary,
                },
              ]}
            >
              <Text style={styles.suggestionText}>{suggestion.message}</Text>
              {onUpgradePress && (
                <TouchableOpacity onPress={onUpgradePress}>
                  <Text style={styles.suggestionAction}>Upgrade Now →</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  upgradeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  usageContainer: {
    gap: spacing.md,
  },
  usageItem: {
    marginBottom: spacing.xs,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  usageLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  usageText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  warningText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  unlimitedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  unlimitedText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  suggestionsContainer: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
  },
  suggestionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  suggestionAction: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
