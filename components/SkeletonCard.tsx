import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

interface SkeletonCardProps {
  customWidth?: number;
}

export const SkeletonCard = React.memo(function SkeletonCard({ customWidth }: SkeletonCardProps) {
  const cardWidth = customWidth || CARD_WIDTH;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnimation]);

  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <Animated.View style={[styles.imageContainer, { opacity: shimmerOpacity }]} />

      <View style={styles.content}>
        <Animated.View style={[styles.titleLine1, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.titleLine2, { opacity: shimmerOpacity }]} />

        <Animated.View style={[styles.priceLine, { opacity: shimmerOpacity }]} />

        <View style={styles.ratingContainer}>
          <Animated.View style={[styles.starPlaceholder, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.ratingText, { opacity: shimmerOpacity }]} />
        </View>

        <View style={styles.providerContainer}>
          <Animated.View style={[styles.avatarPlaceholder, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.providerName, { opacity: shimmerOpacity }]} />
        </View>

        <Animated.View style={[styles.buttonPlaceholder, { opacity: shimmerOpacity }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: colors.border,
  },
  content: {
    padding: spacing.sm,
  },
  titleLine1: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 6,
    width: '90%',
  },
  titleLine2: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
    width: '60%',
  },
  priceLine: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.xs,
    width: '40%',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  starPlaceholder: {
    width: 12,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    marginRight: 4,
  },
  ratingText: {
    height: 12,
    width: 30,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarPlaceholder: {
    width: 20,
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 10,
    marginRight: spacing.xs,
  },
  providerName: {
    height: 12,
    width: 80,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  buttonPlaceholder: {
    height: 32,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
});
