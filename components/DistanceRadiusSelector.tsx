import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface DistanceRadiusSelectorProps {
  distance: number;
  onDistanceChange: (distance: number) => void;
  useCurrentLocation?: boolean;
  onUseLocationToggle?: () => void;
}

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];
const MIN_DISTANCE = 1;
const MAX_DISTANCE = 100;

export function DistanceRadiusSelector({
  distance,
  onDistanceChange,
  useCurrentLocation = false,
  onUseLocationToggle,
}: DistanceRadiusSelectorProps) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [thumbPosition] = useState(new Animated.Value(0));
  const [showSlider, setShowSlider] = useState(false);

  const sliderWidthRef = useRef(0);

  const normalizeValue = (value: number): number => {
    return (value - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE);
  };

  const denormalizeValue = (normalized: number): number => {
    const value = normalized * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE;
    if (value <= 10) return Math.round(value);
    if (value <= 25) return Math.round(value / 5) * 5;
    return Math.round(value / 10) * 10;
  };

  const updateDistance = (position: number) => {
    const normalized = Math.max(0, Math.min(position / sliderWidthRef.current, 1));
    const newDistance = denormalizeValue(normalized);
    thumbPosition.setValue(normalized);
    onDistanceChange(newDistance);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (_, gestureState) => {
      if (sliderWidthRef.current > 0) {
        const newPosition = Math.max(
          0,
          Math.min(gestureState.moveX - gestureState.x0 + thumbPosition._value * sliderWidthRef.current,
          sliderWidthRef.current)
        );
        updateDistance(newPosition);
      }
    },

    onPanResponderMove: (_, gestureState) => {
      if (sliderWidthRef.current > 0) {
        const touchX =
          gestureState.moveX - gestureState.x0 +
          thumbPosition._value * sliderWidthRef.current;

        const newPosition = Math.max(0, Math.min(touchX, sliderWidthRef.current));
        updateDistance(newPosition);
      }
    },
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
    sliderWidthRef.current = width;
    const normalized = normalizeValue(distance);
    thumbPosition.setValue(normalized);
  };

  const thumbLeft = thumbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth - 28],
  });

  const trackWidth = thumbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth],
  });

  const getDistanceColor = (dist: number): string => {
    if (dist <= 10) return colors.success;
    if (dist <= 25) return colors.primary;
    if (dist <= 50) return colors.warning;
    return colors.error;
  };

  const getDistanceLabel = (dist: number): string => {
    if (dist <= 10) return 'Nearby';
    if (dist <= 25) return 'Local Area';
    if (dist <= 50) return 'Wider Area';
    return 'Extended Range';
  };

  const calculateCircleScale = (dist: number, minScale: number, maxScale: number): number => {
    const normalized = (dist - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE);
    return minScale + normalized * (maxScale - minScale);
  };

  const innerCircleScale = calculateCircleScale(distance, 0.4, 2.0);
  const middleCircleScale = calculateCircleScale(distance, 0.6, 3.0);
  const outerCircleScale = calculateCircleScale(distance, 0.8, 4.0);

  return (
    <View style={styles.container}>
      {/* Current Location Toggle */}
      {onUseLocationToggle && (
        <TouchableOpacity
          style={[styles.locationToggle, useCurrentLocation && styles.locationToggleActive]}
          onPress={onUseLocationToggle}
          activeOpacity={0.7}
        >
          <Navigation
            size={18}
            color={useCurrentLocation ? colors.white : colors.primary}
            fill={useCurrentLocation ? colors.white : 'none'}
          />
          <Text
            style={[
              styles.locationToggleText,
              useCurrentLocation && styles.locationToggleTextActive,
            ]}
          >
            Use Current Location
          </Text>
        </TouchableOpacity>
      )}

      {/* Distance Display */}
      <View style={styles.distanceDisplay}>
        <View style={styles.distanceValue}>
          <Text style={[styles.distanceNumber, { color: getDistanceColor(distance) }]}>
            {distance}
          </Text>
          <Text style={styles.distanceUnit}>miles</Text>
        </View>
        <Text style={styles.distanceLabel}>{getDistanceLabel(distance)}</Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, !showSlider && styles.modeButtonActive]}
          onPress={() => setShowSlider(false)}
        >
          <Text style={[styles.modeButtonText, !showSlider && styles.modeButtonTextActive]}>
            Quick Select
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, showSlider && styles.modeButtonActive]}
          onPress={() => setShowSlider(true)}
        >
          <Text style={[styles.modeButtonText, showSlider && styles.modeButtonTextActive]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Select Chips */}
      {!showSlider ? (
        <View style={styles.quickSelect}>
          {DISTANCE_OPTIONS.map((dist) => {
            const isSelected = distance === dist;
            return (
              <TouchableOpacity
                key={dist}
                style={[
                  styles.distanceChip,
                  isSelected && styles.distanceChipSelected,
                  isSelected && { borderColor: getDistanceColor(dist) },
                ]}
                onPress={() => onDistanceChange(dist)}
                activeOpacity={0.7}
              >
                <MapPin
                  size={16}
                  color={isSelected ? colors.white : getDistanceColor(dist)}
                />
                <Text
                  style={[
                    styles.distanceChipText,
                    isSelected && styles.distanceChipTextSelected,
                  ]}
                >
                  {dist} mi
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        /* Custom Slider */
        <View style={styles.sliderSection}>
          <View style={styles.sliderContainer} onLayout={handleLayout}>
            {/* Track */}
            <View style={styles.track} />

            {/* Active Track */}
            <Animated.View
              style={[
                styles.activeTrack,
                {
                  width: trackWidth,
                  backgroundColor: getDistanceColor(distance),
                },
              ]}
            />

            {/* Thumb */}
            <Animated.View
              style={[
                styles.thumb,
                {
                  left: thumbLeft,
                  borderColor: getDistanceColor(distance),
                },
              ]}
              {...panResponder.panHandlers}
            >
              <View
                style={[styles.thumbInner, { backgroundColor: getDistanceColor(distance) }]}
              />
            </Animated.View>
          </View>

          {/* Range Labels */}
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>{MIN_DISTANCE} mi</Text>
            <Text style={styles.rangeLabel}>{MAX_DISTANCE} mi</Text>
          </View>
        </View>
      )}

      {/* Visual Radius Indicator */}
      <View style={styles.radiusVisual}>
        <View style={styles.radiusCircle}>
          <View
            style={[
              styles.radiusInner,
              { opacity: 0.3, transform: [{ scale: innerCircleScale }] },
            ]}
          />
          <View
            style={[
              styles.radiusInner,
              { opacity: 0.2, transform: [{ scale: middleCircleScale }] },
            ]}
          />
          <View
            style={[
              styles.radiusInner,
              { opacity: 0.1, transform: [{ scale: outerCircleScale }] },
            ]}
          />
          <View style={styles.radiusCenter}>
            <MapPin size={16} color={colors.white} />
          </View>
        </View>
        <Text style={styles.radiusText}>Search area visualization</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  locationToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationToggleText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  locationToggleTextActive: {
    color: colors.white,
  },
  distanceDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  distanceValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  distanceNumber: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
  },
  distanceUnit: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  distanceLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.white,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  modeButtonTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  quickSelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  distanceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  distanceChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  distanceChipTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  sliderSection: {
    gap: spacing.sm,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  activeTrack: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    top: 6,
  },
  thumbInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  radiusVisual: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  radiusCircle: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radiusInner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  radiusCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  radiusText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: spacing.md,
  },
});
