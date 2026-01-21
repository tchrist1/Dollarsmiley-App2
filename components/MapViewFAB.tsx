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
import { MapPin, User, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

export type MapViewMode = 'listings' | 'providers' | 'services' | 'jobs_all' | 'jobs_fixed' | 'jobs_quoted';

interface MapViewFABProps {
  mode: MapViewMode;
  onModeChange: (mode: MapViewMode) => void;
  fabOpacity?: Animated.Value;
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

export default function MapViewFAB({ mode, onModeChange, fabOpacity }: MapViewFABProps) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(scaleAnim, {
      toValue,
      duration: 150,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const handleModeSelect = (newMode: MapViewMode) => {
    onModeChange(newMode);
    toggleExpanded();
  };

  const getModeLabel = (selectedMode: MapViewMode): string => {
    switch (selectedMode) {
      case 'listings': return 'Listings';
      case 'providers': return 'Providers';
      case 'services': return 'Services';
      case 'jobs_all': return 'All Jobs';
      case 'jobs_fixed': return 'Fixed-priced Jobs';
      case 'jobs_quoted': return 'Quoted Jobs';
      default: return 'Listings';
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
          opacity: fabOpacity || 1,
        },
      ]}
      pointerEvents="box-none"
    >
      {expanded && (
        <Animated.View
          style={[
            styles.menuContainer,
            {
              opacity: scaleAnim,
              transform: [
                {
                  translateY: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Listings */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'listings' && styles.menuItemActive]}
            onPress={() => handleModeSelect('listings')}
            activeOpacity={0.7}
          >
            <MapPin
              size={18}
              color={mode === 'listings' ? colors.white : colors.text}
            />
            <Text style={[styles.menuText, mode === 'listings' && styles.menuTextActive]}>
              Listings
            </Text>
          </TouchableOpacity>

          {/* Providers */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'providers' && styles.menuItemActive]}
            onPress={() => handleModeSelect('providers')}
            activeOpacity={0.7}
          >
            <User
              size={18}
              color={mode === 'providers' ? colors.white : colors.text}
            />
            <Text style={[styles.menuText, mode === 'providers' && styles.menuTextActive]}>
              Providers
            </Text>
          </TouchableOpacity>

          {/* Services */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'services' && styles.menuItemActive]}
            onPress={() => handleModeSelect('services')}
            activeOpacity={0.7}
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

          {/* All Jobs */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'jobs_all' && styles.menuItemActive]}
            onPress={() => handleModeSelect('jobs_all')}
            activeOpacity={0.7}
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
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
          }}
        >
          {expanded ? (
            <X size={16} color={colors.white} />
          ) : (
            <MapPin size={16} color={colors.white} />
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
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10001,
    zIndex: 10001,
  },
  fabExpanded: {
    backgroundColor: colors.error,
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
