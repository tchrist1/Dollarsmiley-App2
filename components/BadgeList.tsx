import { View, Text, StyleSheet, ScrollView } from 'react-native';
import VerificationBadge, { Badge } from './VerificationBadge';
import { spacing } from '@/constants/theme';

interface BadgeListProps {
  badges: Badge[];
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  maxVisible?: number;
  horizontal?: boolean;
}

export default function BadgeList({
  badges,
  size = 'small',
  showLabel = false,
  maxVisible,
  horizontal = true,
}: BadgeListProps) {
  if (!badges || badges.length === 0) {
    return null;
  }

  const visibleBadges = maxVisible ? badges.slice(0, maxVisible) : badges;
  const remainingCount = maxVisible && badges.length > maxVisible ? badges.length - maxVisible : 0;

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
      >
        {visibleBadges.map((badge, index) => (
          <View key={badge.slug || index} style={styles.badgeWrapper}>
            <VerificationBadge badge={badge} size={size} showLabel={showLabel} />
          </View>
        ))}
        {remainingCount > 0 && (
          <View style={[styles.badgeWrapper, styles.remainingBadge]}>
            <Text style={styles.remainingText}>+{remainingCount}</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.verticalContainer}>
      {visibleBadges.map((badge, index) => (
        <View key={badge.slug || index} style={styles.badgeWrapperVertical}>
          <VerificationBadge badge={badge} size={size} showLabel={showLabel} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  verticalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badgeWrapper: {
    marginRight: spacing.xs,
  },
  badgeWrapperVertical: {
    marginBottom: spacing.xs,
  },
  remainingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
});
