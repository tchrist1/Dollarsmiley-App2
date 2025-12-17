import { View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { TrendingUp, Award, Zap } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  getUserLevel,
  calculateLevelProgress,
  formatXP,
  type ProfileGamification,
  type UserLevel,
} from '@/lib/gamification';

interface LevelProgressCardProps {
  gamification: ProfileGamification;
}

export default function LevelProgressCard({ gamification }: LevelProgressCardProps) {
  const [currentLevelInfo, setCurrentLevelInfo] = useState<UserLevel | null>(null);
  const [nextLevelInfo, setNextLevelInfo] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLevelInfo();
  }, [gamification.current_level]);

  const loadLevelInfo = async () => {
    setLoading(true);
    try {
      const current = await getUserLevel(gamification.current_level);
      const next = await getUserLevel(gamification.current_level + 1);
      setCurrentLevelInfo(current);
      setNextLevelInfo(next);
    } catch (error) {
      console.error('Error loading level info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !currentLevelInfo) {
    return null;
  }

  const { percentage, xpNeeded, xpProgress } = calculateLevelProgress(
    gamification.current_level_xp,
    gamification.current_level,
    nextLevelInfo
  );

  const isMaxLevel = !nextLevelInfo;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: currentLevelInfo.badge_color + '20', borderColor: currentLevelInfo.badge_color },
            ]}
          >
            <Text style={[styles.levelNumber, { color: currentLevelInfo.badge_color }]}>
              {gamification.current_level}
            </Text>
          </View>
          <View>
            <Text style={styles.levelTitle}>{currentLevelInfo.title}</Text>
            <Text style={styles.levelSubtitle}>Current Level</Text>
          </View>
        </View>

        <View style={styles.xpBadge}>
          <Zap size={16} color={colors.warning} fill={colors.warning} />
          <Text style={styles.xpText}>{formatXP(gamification.total_xp)} XP</Text>
        </View>
      </View>

      {/* Progress Bar */}
      {!isMaxLevel && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {formatXP(xpProgress)} / {formatXP(xpNeeded)} XP
            </Text>
            <Text style={styles.progressPercentage}>{percentage}%</Text>
          </View>
        </View>
      )}

      {/* Next Level Info */}
      {!isMaxLevel && nextLevelInfo && (
        <View style={styles.nextLevelSection}>
          <TrendingUp size={16} color={colors.textSecondary} />
          <Text style={styles.nextLevelText}>
            {formatXP(xpNeeded - xpProgress)} XP to level {gamification.current_level + 1}: {nextLevelInfo.title}
          </Text>
        </View>
      )}

      {isMaxLevel && (
        <View style={styles.maxLevelSection}>
          <Award size={20} color={colors.warning} />
          <Text style={styles.maxLevelText}>Max Level Reached!</Text>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{gamification.bookings_completed}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{gamification.achievements_count}</Text>
          <Text style={styles.statLabel}>Achievements</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{gamification.current_streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{gamification.five_star_reviews}</Text>
          <Text style={styles.statLabel}>5-Stars</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  levelTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  levelSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  xpText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressPercentage: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  nextLevelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  nextLevelText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  maxLevelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  maxLevelText: {
    fontSize: fontSize.md,
    color: colors.warning,
    fontWeight: fontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
