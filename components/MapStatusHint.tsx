import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { MapViewMode } from '@/types/map';

interface MapStatusHintProps {
  locationCount: number;
  zoomLevel: number;
  visible: boolean;
  mode: MapViewMode;
}

export default function MapStatusHint({
  locationCount,
  zoomLevel,
  visible,
  mode,
}: MapStatusHintProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-20)).current;

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      fadeAnim.stopAnimation();
      translateYAnim.stopAnimation();
    };
  }, [fadeAnim, translateYAnim]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);

      return () => clearTimeout(timeout);
    } else {
      fadeAnim.setValue(0);
      translateYAnim.setValue(-20);
    }
  }, [visible, locationCount, zoomLevel]);

  if (!visible) return null;

  const getModeLabel = (): string => {
    switch (mode) {
      case 'listings': return 'locations';
      case 'providers': return 'providers';
      case 'services': return 'services';
      case 'jobs_all': return 'jobs';
      case 'jobs_fixed': return 'fixed-price jobs';
      case 'jobs_quoted': return 'quoted jobs';
      default: return 'locations';
    }
  };

  const label = getModeLabel();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.lg,
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      <MapPin size={16} color={colors.text} />
      <Text style={styles.text}>
        {locationCount} {label} · Zoom {zoomLevel.toFixed(1)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.md,
    zIndex: 100,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
});
