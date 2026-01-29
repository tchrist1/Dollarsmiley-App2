import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { MapViewMode } from '@/types/map';

interface MapViewFABProps {
  mode: MapViewMode;
  onModeChange: (mode: MapViewMode) => void;
}

interface ConcentricIconProps {
  label: string;
  color: string;
  isActive: boolean;
}

const ConcentricIcon: React.FC<ConcentricIconProps> = ({ label, color, isActive }) => {
  return (
    <View style={styles.concentricContainer}>
      <View
        style={[
          styles.concentricOuter,
          { borderColor: color },
          isActive && { borderColor: colors.white, backgroundColor: colors.white },
        ]}
      >
        <View
          style={[
            styles.concentricInner,
            { backgroundColor: isActive ? color : colors.white },
          ]}
        >
          <Text
            style={[
              styles.concentricText,
              { color: isActive ? colors.white : color },
            ]}
          >
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function MapViewFAB({ mode, onModeChange }: MapViewFABProps) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Cleanup animations on unmount
  React.useEffect(() => {
    return () => {
      menuAnim.stopAnimation();
      shakeAnim.stopAnimation();
    };
  }, [menuAnim, shakeAnim]);

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;

    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 75,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 75,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    setExpanded(!expanded);
  };

  const handleModeSelect = (newMode: MapViewMode) => {
    if (__DEV__) {
      console.log('[Map FAB] Mode changed:', { from: mode, to: newMode });
    }
    onModeChange(newMode);
    toggleExpanded();
  };

  const getModeLabel = (selectedMode: MapViewMode): string => {
    switch (selectedMode) {
      case 'listings': return 'All';
      case 'providers': return 'S Providers';
      case 'services': return 'Services';
      case 'jobs_all': return 'All Jobs';
      case 'jobs_fixed': return 'Fixed-priced Jobs';
      case 'jobs_quoted': return 'Quoted Jobs';
      default: return 'All';
    }
  };

  // Position at center-right, above the utility FAB
  // Total height of both FABs + gap = 44 + 15 + 42 = 101
  // This FAB centers at 50% - 46dp, placing it perfectly above the lower FAB
  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: '50%',
          marginTop: -46,
          right: spacing.md,
          transform: [
            {
              translateX: shakeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 3],
              }),
            },
          ],
        },
      ]}
      pointerEvents="box-none"
    >
      {expanded && (
        <Animated.View
          style={[
            styles.menuContainer,
            {
              opacity: menuAnim,
              transform: [
                {
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          {/* All */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'listings' && styles.menuItemActive]}
            onPress={() => handleModeSelect('listings')}
            activeOpacity={0.7}
            pointerEvents="auto"
            accessibilityLabel="Show all listings on map"
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'listings' }}
          >
            <MapPin
              size={18}
              color={mode === 'listings' ? colors.white : colors.text}
            />
            <Text style={[styles.menuText, mode === 'listings' && styles.menuTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {/* Services */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'services' && styles.menuItemActive]}
            onPress={() => handleModeSelect('services')}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <ConcentricIcon
              label="S"
              color="#10B981"
              isActive={mode === 'services'}
            />
            <Text style={[styles.menuText, mode === 'services' && styles.menuTextActive]}>
              Services
            </Text>
          </TouchableOpacity>

          {/* S Providers */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'providers' && styles.menuItemActive]}
            onPress={() => handleModeSelect('providers')}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <ConcentricIcon
              label="SP"
              color="#9BE44D"
              isActive={mode === 'providers'}
            />
            <Text style={[styles.menuText, mode === 'providers' && styles.menuTextActive]}>
              S Providers
            </Text>
          </TouchableOpacity>

          {/* All Jobs */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'jobs_all' && styles.menuItemActive]}
            onPress={() => handleModeSelect('jobs_all')}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <ConcentricIcon
              label="J"
              color="#F59E0B"
              isActive={mode === 'jobs_all'}
            />
            <Text style={[styles.menuText, mode === 'jobs_all' && styles.menuTextActive]}>
              All Jobs
            </Text>
          </TouchableOpacity>

          {/* Quoted Jobs */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'jobs_quoted' && styles.menuItemActive]}
            onPress={() => handleModeSelect('jobs_quoted')}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <ConcentricIcon
              label="QJ"
              color="#F59E0B"
              isActive={mode === 'jobs_quoted'}
            />
            <Text style={[styles.menuText, mode === 'jobs_quoted' && styles.menuTextActive]}>
              Quoted Jobs
            </Text>
          </TouchableOpacity>

          {/* Fixed-priced Jobs */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'jobs_fixed' && styles.menuItemActive]}
            onPress={() => handleModeSelect('jobs_fixed')}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <ConcentricIcon
              label="FJ"
              color="#F59E0B"
              isActive={mode === 'jobs_fixed'}
            />
            <Text style={[styles.menuText, mode === 'jobs_fixed' && styles.menuTextActive]}>
              Fixed-priced Jobs
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FAB Button */}
      <TouchableOpacity
        style={[styles.fab, expanded && styles.fabExpanded]}
        onPress={toggleExpanded}
        activeOpacity={0.9}
        pointerEvents="auto"
        accessibilityLabel={expanded ? 'Close map view options' : 'Open map view options'}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
          }}
        >
          {expanded ? (
            <X size={16} color="rgba(255, 255, 255, 0.95)" />
          ) : (
            <MapPin size={16} color="rgba(255, 255, 255, 0.95)" />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Backdrop to close menu when tapping outside */}
      {expanded && (
        <Pressable style={styles.backdrop} onPress={toggleExpanded} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 10000,
    elevation: 10000,
    overflow: 'visible',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 50,
    right: 0,
    gap: spacing.xs,
    alignItems: 'flex-end',
    minWidth: 180,
    overflow: 'visible',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    minHeight: 44,
    minWidth: 160,
    flexWrap: 'nowrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 10001,
    zIndex: 10001,
  },
  menuItemActive: {
    backgroundColor: colors.primary,
  },
  menuText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  menuTextActive: {
    color: colors.white,
  },
  concentricContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concentricOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concentricInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concentricText: {
    fontSize: 7,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10001,
    zIndex: 10001,
  },
  fabExpanded: {
    backgroundColor: 'rgba(239, 68, 68, 0.88)',
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: -1,
  },
});
