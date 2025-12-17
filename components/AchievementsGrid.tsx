import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import {
  Trophy,
  Lock,
  Star,
  Calendar,
  Users,
  User,
  DollarSign,
  Award,
  Crown,
  X,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  getAllAchievements,
  getProfileAchievements,
  getTierColor,
  getTierDisplayName,
  getCategoryIcon,
  getAchievementCompletionPercentage,
  checkAchievementProgress,
  type Achievement,
  type ProfileAchievement,
  type ProfileGamification,
} from '@/lib/gamification';

const IconMap: Record<string, any> = {
  calendar: Calendar,
  star: Star,
  users: Users,
  user: User,
  'dollar-sign': DollarSign,
  trophy: Trophy,
  award: Award,
  crown: Crown,
};

interface AchievementsGridProps {
  profileId: string;
  gamification: ProfileGamification;
}

export default function AchievementsGrid({ profileId, gamification }: AchievementsGridProps) {
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<ProfileAchievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadAchievements();
  }, [profileId]);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const [all, earned] = await Promise.all([
        getAllAchievements(),
        getProfileAchievements(profileId),
      ]);
      setAllAchievements(all);
      setEarnedAchievements(earned);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAchievementEarned = (achievementId: string): ProfileAchievement | undefined => {
    return earnedAchievements.find((ea) => ea.achievement_id === achievementId);
  };

  const getAchievementIcon = (iconName?: string) => {
    if (!iconName) return Trophy;
    const Icon = IconMap[iconName] || Trophy;
    return Icon;
  };

  const filteredAchievements = allAchievements.filter((achievement) => {
    if (filter === 'all') return true;
    if (filter === 'earned') return isAchievementEarned(achievement.id);
    if (filter === 'locked') return !isAchievementEarned(achievement.id);
    return achievement.category === filter;
  });

  const completionPercentage = getAchievementCompletionPercentage(
    earnedAchievements.length,
    allAchievements.length
  );

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const earned = isAchievementEarned(item.id);
    const Icon = getAchievementIcon(item.icon);
    const tierColor = getTierColor(item.tier);
    const { progress } = checkAchievementProgress(item, gamification);

    return (
      <TouchableOpacity
        style={[styles.achievementCard, !earned && styles.achievementCardLocked]}
        onPress={() => setSelectedAchievement(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.achievementIcon,
            { backgroundColor: earned ? tierColor + '20' : colors.surface },
            !earned && styles.achievementIconLocked,
          ]}
        >
          {earned ? (
            <Icon size={24} color={tierColor} />
          ) : (
            <Lock size={24} color={colors.textLight} />
          )}
        </View>

        <Text
          style={[
            styles.achievementName,
            !earned && styles.achievementNameLocked,
          ]}
          numberOfLines={2}
        >
          {item.is_secret && !earned ? '???' : item.name}
        </Text>

        {!earned && progress > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        )}

        {earned && (
          <View style={[styles.tierBadge, { backgroundColor: tierColor + '20' }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>
              {getTierDisplayName(item.tier)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'earned', label: 'Earned' },
    { key: 'locked', label: 'Locked' },
    { key: 'booking', label: 'Booking' },
    { key: 'quality', label: 'Quality' },
    { key: 'earnings', label: 'Earnings' },
    { key: 'social', label: 'Social' },
    { key: 'milestone', label: 'Milestone' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Trophy size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>Achievements</Text>
        </View>
        <View style={styles.completionBadge}>
          <Text style={styles.completionText}>{completionPercentage}%</Text>
        </View>
      </View>

      <Text style={styles.headerSubtitle}>
        {earnedAchievements.length} of {allAchievements.length} unlocked
      </Text>

      {/* Filters */}
      <View style={styles.filters}>
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterButton,
              filter === option.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(option.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === option.key && styles.filterTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Achievements Grid */}
      <FlatList
        data={filteredAchievements}
        renderItem={renderAchievement}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Lock size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No achievements found</Text>
          </View>
        }
      />

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <Modal
          visible={!!selectedAchievement}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedAchievement(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedAchievement(null)}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              {(() => {
                const earned = isAchievementEarned(selectedAchievement.id);
                const Icon = getAchievementIcon(selectedAchievement.icon);
                const tierColor = getTierColor(selectedAchievement.tier);
                const { progress } = checkAchievementProgress(selectedAchievement, gamification);

                return (
                  <>
                    <View
                      style={[
                        styles.modalIcon,
                        { backgroundColor: earned ? tierColor + '20' : colors.surface },
                      ]}
                    >
                      {earned ? (
                        <Icon size={48} color={tierColor} />
                      ) : (
                        <Lock size={48} color={colors.textLight} />
                      )}
                    </View>

                    <Text style={styles.modalTitle}>
                      {selectedAchievement.is_secret && !earned
                        ? 'Secret Achievement'
                        : selectedAchievement.name}
                    </Text>

                    <View style={[styles.modalTierBadge, { backgroundColor: tierColor + '20' }]}>
                      <Text style={[styles.modalTierText, { color: tierColor }]}>
                        {getTierDisplayName(selectedAchievement.tier)}
                      </Text>
                    </View>

                    <Text style={styles.modalDescription}>
                      {selectedAchievement.is_secret && !earned
                        ? 'Keep exploring to unlock this secret achievement!'
                        : selectedAchievement.description}
                    </Text>

                    <View style={styles.modalReward}>
                      <Star size={20} color={colors.warning} fill={colors.warning} />
                      <Text style={styles.modalRewardText}>
                        +{selectedAchievement.xp_reward} XP
                      </Text>
                    </View>

                    {earned && earned.earned_at && (
                      <Text style={styles.modalEarnedDate}>
                        Unlocked on {new Date(earned.earned_at).toLocaleDateString()}
                      </Text>
                    )}

                    {!earned && progress > 0 && (
                      <View style={styles.modalProgress}>
                        <View style={styles.modalProgressBar}>
                          <View style={[styles.modalProgressFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={styles.modalProgressText}>{Math.round(progress)}% Complete</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  completionBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  completionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filterTextActive: {
    color: colors.white,
  },
  gridContent: {
    paddingBottom: spacing.xl,
  },
  gridRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  achievementCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  achievementCardLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  achievementIconLocked: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  achievementName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  achievementNameLocked: {
    color: colors.textLight,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  tierText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  },
  modalIcon: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalTierBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  modalTierText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  modalDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  modalRewardText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  modalEarnedDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  modalProgress: {
    width: '100%',
    marginTop: spacing.lg,
  },
  modalProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  modalProgressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
