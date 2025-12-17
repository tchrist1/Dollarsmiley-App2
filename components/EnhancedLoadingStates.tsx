import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'medium', color = colors.primary, text }: LoadingSpinnerProps) {
  const sizeMap = {
    small: 24,
    medium: 48,
    large: 64,
  };

  return (
    <View style={styles.spinnerContainer}>
      <ActivityIndicator size={size === 'small' ? 'small' : 'large'} color={color} />
      {text && <Text style={styles.spinnerText}>{text}</Text>}
    </View>
  );
}

export function PulsingDot({ delay = 0 }: { delay?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

export function LoadingDots() {
  return (
    <View style={styles.dotsContainer}>
      <PulsingDot delay={0} />
      <PulsingDot delay={200} />
      <PulsingDot delay={400} />
    </View>
  );
}

export function ProgressBar({ progress, height = 4, color = colors.primary }: {
  progress: number;
  height?: number;
  color?: string;
}) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.progressBarContainer, { height }]}>
      <Animated.View
        style={[
          styles.progressBarFill,
          { width: progressWidth, backgroundColor: color, height }
        ]}
      />
    </View>
  );
}

export function CircularProgress({
  progress,
  size = 100,
  strokeWidth = 8,
  color = colors.primary,
  text
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  text?: string;
}) {
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.circularProgress, { width: size, height: size }]}>
      <View style={styles.circularProgressInner}>
        <Text style={styles.circularProgressText}>
          {text || `${Math.round(progress)}%`}
        </Text>
      </View>
    </View>
  );
}

export function ShimmerEffect({ width, height, borderRadius: br = 8 }: {
  width: number | string;
  height: number;
  borderRadius?: number;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={[styles.shimmerContainer, { width, height, borderRadius: br }]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

export function LoadingCard() {
  return (
    <View style={styles.loadingCard}>
      <ShimmerEffect width="100%" height={200} borderRadius={12} />
      <View style={styles.loadingCardContent}>
        <ShimmerEffect width="80%" height={24} borderRadius={6} />
        <ShimmerEffect width="60%" height={16} borderRadius={6} />
        <View style={styles.loadingCardFooter}>
          <ShimmerEffect width={80} height={20} borderRadius={10} />
          <ShimmerEffect width={60} height={20} borderRadius={10} />
        </View>
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.emptyState, { transform: [{ scale }] }]}>
      <View style={styles.emptyStateIcon}>{icon}</View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateDescription}>{description}</Text>
      {action && <View style={styles.emptyStateAction}>{action}</View>}
    </Animated.View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <LoadingCard key={index} />
      ))}
    </View>
  );
}

export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <View style={styles.inlineLoader}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.inlineLoaderText}>{text}</Text>
    </View>
  );
}

export function RefreshIndicator({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[
        styles.refreshIndicator,
        { opacity, transform: [{ translateY }] }
      ]}
    >
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.refreshText}>Refreshing...</Text>
    </Animated.View>
  );
}

export function LoadingOverlay({ visible, text }: { visible: boolean; text?: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.loadingOverlay, { opacity }]}>
      <View style={styles.loadingOverlayContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        {text && <Text style={styles.loadingOverlayText}>{text}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  spinnerText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressBarContainer: {
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    borderRadius: borderRadius.sm,
  },
  circularProgress: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  shimmerContainer: {
    backgroundColor: colors.backgroundSecondary,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  loadingCardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateIcon: {
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateAction: {
    marginTop: spacing.md,
  },
  skeletonList: {
    padding: spacing.md,
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  inlineLoaderText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: spacing.sm,
  },
  refreshText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingOverlayContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 150,
  },
  loadingOverlayText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
});
