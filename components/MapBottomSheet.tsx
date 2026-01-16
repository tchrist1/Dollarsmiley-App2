import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, User, ChevronUp, ChevronDown } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MapBottomSheetProps {
  mode: 'listings' | 'providers';
  onModeChange: (mode: 'listings' | 'providers') => void;
  children?: React.ReactNode;
  listingsCount?: number;
}

type SheetState = 'collapsed' | 'half' | 'full';

export default function MapBottomSheet({
  mode,
  onModeChange,
  children,
  listingsCount = 0,
}: MapBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');

  const COLLAPSED_HEIGHT = 120 + insets.bottom;
  const HALF_HEIGHT = SCREEN_HEIGHT * 0.5;
  const FULL_HEIGHT = SCREEN_HEIGHT - 100;

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT - COLLAPSED_HEIGHT)).current;

  const getTargetHeight = (state: SheetState): number => {
    switch (state) {
      case 'collapsed':
        return SCREEN_HEIGHT - COLLAPSED_HEIGHT;
      case 'half':
        return SCREEN_HEIGHT - HALF_HEIGHT;
      case 'full':
        return SCREEN_HEIGHT - FULL_HEIGHT;
      default:
        return SCREEN_HEIGHT - COLLAPSED_HEIGHT;
    }
  };

  const animateToState = (state: SheetState) => {
    const targetY = getTargetHeight(state);
    Animated.spring(translateY, {
      toValue: targetY,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
    setSheetState(state);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = getTargetHeight(sheetState) + gestureState.dy;
        const minY = getTargetHeight('full');
        const maxY = getTargetHeight('collapsed');

        if (newY >= minY && newY <= maxY) {
          translateY.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = getTargetHeight(sheetState) + gestureState.dy;
        const velocity = gestureState.vy;

        if (velocity > 0.5) {
          if (sheetState === 'full') {
            animateToState('half');
          } else if (sheetState === 'half') {
            animateToState('collapsed');
          }
        } else if (velocity < -0.5) {
          if (sheetState === 'collapsed') {
            animateToState('half');
          } else if (sheetState === 'half') {
            animateToState('full');
          }
        } else {
          const collapsedY = getTargetHeight('collapsed');
          const halfY = getTargetHeight('half');
          const fullY = getTargetHeight('full');

          const distToCollapsed = Math.abs(currentY - collapsedY);
          const distToHalf = Math.abs(currentY - halfY);
          const distToFull = Math.abs(currentY - fullY);

          const minDist = Math.min(distToCollapsed, distToHalf, distToFull);

          if (minDist === distToFull) {
            animateToState('full');
          } else if (minDist === distToHalf) {
            animateToState('half');
          } else {
            animateToState('collapsed');
          }
        }
      },
    })
  ).current;

  const handleExpandCollapse = () => {
    if (sheetState === 'collapsed') {
      animateToState('half');
    } else if (sheetState === 'half') {
      animateToState('full');
    } else {
      animateToState('collapsed');
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handle}>
        <View style={styles.handleBar} />
      </View>

      <View style={styles.header}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'listings' && styles.modeButtonActive]}
            onPress={() => onModeChange('listings')}
            activeOpacity={0.7}
          >
            <MapPin size={16} color={mode === 'listings' ? colors.white : colors.text} />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'listings' && styles.modeButtonTextActive,
              ]}
            >
              Listings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'providers' && styles.modeButtonActive]}
            onPress={() => onModeChange('providers')}
            activeOpacity={0.7}
          >
            <User size={16} color={mode === 'providers' ? colors.white : colors.text} />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'providers' && styles.modeButtonTextActive,
              ]}
            >
              Providers
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.expandButton}
          onPress={handleExpandCollapse}
          activeOpacity={0.7}
        >
          {sheetState === 'collapsed' ? (
            <ChevronUp size={20} color={colors.text} />
          ) : (
            <ChevronDown size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {listingsCount > 0 && sheetState === 'collapsed' && (
        <View style={styles.collapsedInfo}>
          <Text style={styles.collapsedInfoText}>
            {listingsCount} {mode === 'listings' ? 'locations' : 'providers'} on map
          </Text>
        </View>
      )}

      {(sheetState === 'half' || sheetState === 'full') && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetState === 'full'}
        >
          {children}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.lg,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: 3,
    flex: 1,
    marginRight: spacing.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  modeButtonTextActive: {
    color: colors.white,
  },
  expandButton: {
    padding: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
  },
  collapsedInfo: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  collapsedInfoText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
});
