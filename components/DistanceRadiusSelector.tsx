import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface DistanceRadiusSelectorProps {
  distance: number | undefined;
  onDistanceChange: (distance: number) => void;
  useCurrentLocation?: boolean;
  onUseLocationToggle?: () => void;
}

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

// QUICK WIN 2: Pure calculation function (no dependencies)
function calculateCircleScale(dist: number, minScale: number, maxScale: number): number {
  const MIN_DISTANCE = 1;
  const MAX_DISTANCE = 100;
  const normalized = (dist - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE);
  return minScale + normalized * (maxScale - minScale);
}

export const DistanceRadiusSelector = React.memo(function DistanceRadiusSelector({
  distance,
  onDistanceChange,
  useCurrentLocation = false,
  onUseLocationToggle,
}: DistanceRadiusSelectorProps) {
  const getDistanceColor = useCallback((dist: number): string => {
    if (dist <= 10) return colors.success;
    if (dist <= 25) return colors.primary;
    if (dist <= 50) return colors.warning;
    return colors.error;
  }, []);

  const getDistanceLabel = useCallback((dist: number): string => {
    if (dist <= 10) return 'Nearby';
    if (dist <= 25) return 'Local Area';
    if (dist <= 50) return 'Wider Area';
    return 'Extended Range';
  }, []);

  // QUICK WIN 2: Memoize expensive calculations
  const { innerCircleScale, middleCircleScale, outerCircleScale } = useMemo(() => {
    const dist = distance || 25;
    return {
      innerCircleScale: calculateCircleScale(dist, 0.4, 2.0),
      middleCircleScale: calculateCircleScale(dist, 0.6, 3.0),
      outerCircleScale: calculateCircleScale(dist, 0.8, 4.0),
    };
  }, [distance]);

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
      {distance !== undefined ? (
        <View style={styles.distanceDisplay}>
          <View style={styles.distanceValue}>
            <Text style={[styles.distanceNumber, { color: getDistanceColor(distance) }]}>
              {distance}
            </Text>
            <Text style={styles.distanceUnit}>miles</Text>
          </View>
          <Text style={styles.distanceLabel}>{getDistanceLabel(distance)}</Text>
        </View>
      ) : (
        <View style={styles.distanceDisplay}>
          <Text style={styles.noSelectionText}>No distance filter applied</Text>
          <Text style={styles.noSelectionSubtext}>Select a radius below to filter by distance</Text>
        </View>
      )}

      {/* Quick Select Chips */}
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
});

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
  noSelectionText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  noSelectionSubtext: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
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
