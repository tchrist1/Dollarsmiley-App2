import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';

interface PriceRangeSliderProps {
  minValue: number;
  maxValue: number;
  minPrice: number;
  maxPrice: number;
  onValuesChange: (min: number, max: number) => void;
  onSlidingComplete?: (min: number, max: number) => void;
  step?: number;
}

// ============================================================================
// PERFORMANCE OPTIMIZED: Slider with deferred commit
// ============================================================================
// - onValuesChange: Called during drag for visual feedback only
// - onSlidingComplete: Called on drag end for committing values
// This prevents expensive operations during smooth slider interaction
// ============================================================================

export function PriceRangeSlider({
  minValue = 0,
  maxValue = 50000,
  minPrice,
  maxPrice,
  onValuesChange,
  onSlidingComplete,
  step = 100,
}: PriceRangeSliderProps) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [minThumbPosition] = useState(new Animated.Value(0));
  const [maxThumbPosition] = useState(new Animated.Value(1));
  const minThumbRef = useRef(0);
  const maxThumbRef = useRef(1);

  const normalizeValue = (value: number): number => {
    return (value - minValue) / (maxValue - minValue);
  };

  const denormalizeValue = (normalized: number): number => {
    const value = normalized * (maxValue - minValue) + minValue;
    return Math.round(value / step) * step;
  };

  useEffect(() => {
    if (sliderWidth > 0) {
      const initialMinNormalized = normalizeValue(minPrice);
      const initialMaxNormalized = normalizeValue(maxPrice);

      minThumbPosition.setValue(initialMinNormalized);
      maxThumbPosition.setValue(initialMaxNormalized);
      minThumbRef.current = initialMinNormalized;
      maxThumbRef.current = initialMaxNormalized;
    }
  }, [minPrice, maxPrice, sliderWidth]);

  const updateMinPrice = (normalized: number) => {
    const clampedNormalized = Math.max(0, Math.min(normalized, maxThumbRef.current - 0.02));
    const newMin = denormalizeValue(clampedNormalized);
    const currentMax = denormalizeValue(maxThumbRef.current);

    minThumbPosition.setValue(clampedNormalized);
    minThumbRef.current = clampedNormalized;
    onValuesChange(newMin, currentMax);
  };

  const updateMaxPrice = (normalized: number) => {
    const clampedNormalized = Math.max(minThumbRef.current + 0.02, Math.min(normalized, 1));
    const currentMin = denormalizeValue(minThumbRef.current);
    const newMax = denormalizeValue(clampedNormalized);

    maxThumbPosition.setValue(clampedNormalized);
    maxThumbRef.current = clampedNormalized;
    onValuesChange(currentMin, newMax);
  };

  const minPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      minThumbRef.current = minThumbPosition._value;
    },
    onPanResponderMove: (_, gestureState) => {
      if (sliderWidth > 0) {
        const delta = gestureState.dx / sliderWidth;
        const newNormalized = minThumbRef.current + delta;
        updateMinPrice(newNormalized);
      }
    },
    onPanResponderRelease: () => {
      // Commit final values on drag end
      if (onSlidingComplete) {
        const finalMin = denormalizeValue(minThumbRef.current);
        const finalMax = denormalizeValue(maxThumbRef.current);
        onSlidingComplete(finalMin, finalMax);
      }
    },
  });

  const maxPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      maxThumbRef.current = maxThumbPosition._value;
    },
    onPanResponderMove: (_, gestureState) => {
      if (sliderWidth > 0) {
        const delta = gestureState.dx / sliderWidth;
        const newNormalized = maxThumbRef.current + delta;
        updateMaxPrice(newNormalized);
      }
    },
    onPanResponderRelease: () => {
      // Commit final values on drag end
      if (onSlidingComplete) {
        const finalMin = denormalizeValue(minThumbRef.current);
        const finalMax = denormalizeValue(maxThumbRef.current);
        onSlidingComplete(finalMin, finalMax);
      }
    },
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
  };

  const minLeft = minThumbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth - 24],
  });

  const maxLeft = maxThumbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth - 24],
  });

  const rangeLeft = minThumbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth],
  });

  const rangeWidth = Animated.subtract(maxLeft, minLeft);

  return (
    <View style={styles.container}>
      <View style={styles.labelsContainer}>
        <Text style={styles.valueLabel}>{formatCurrency(minPrice)}</Text>
        <Text style={styles.valueLabel}>{formatCurrency(maxPrice)}</Text>
      </View>

      <View style={styles.sliderContainer} onLayout={handleLayout}>
        {/* Track */}
        <View style={styles.track} />

        {/* Active Range */}
        <Animated.View
          style={[
            styles.activeRange,
            {
              left: rangeLeft,
              width: rangeWidth,
            },
          ]}
        />

        {/* Min Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              left: minLeft,
            },
          ]}
          {...minPanResponder.panHandlers}
        >
          <View style={styles.thumbInner} />
        </Animated.View>

        {/* Max Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              left: maxLeft,
            },
          ]}
          {...maxPanResponder.panHandlers}
        >
          <View style={styles.thumbInner} />
        </Animated.View>
      </View>

      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>{formatCurrency(minValue)}</Text>
        <Text style={styles.rangeLabel}>{formatCurrency(maxValue)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  valueLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  activeRange: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    top: 8,
  },
  thumbInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  rangeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
