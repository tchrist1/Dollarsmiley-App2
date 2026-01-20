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
import { MapPin, User, Briefcase, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

export type MapViewMode = 'listings' | 'providers' | 'services' | 'jobs_all' | 'jobs_fixed' | 'jobs_quoted';

interface MapViewFABProps {
  mode: MapViewMode;
  onModeChange: (mode: MapViewMode) => void;
}

export default function MapViewFAB({ mode, onModeChange }: MapViewFABProps) {
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

  return (
    <View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 16,
          right: spacing.md,
        },
      ]}
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
                    outputRange: [20, 0],
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
            <View style={styles.textIcon}>
              <Text style={[styles.textIconLabel, mode === 'services' && styles.textIconLabelActive]}>S</Text>
            </View>
            <Text style={[styles.menuText, mode === 'services' && styles.menuTextActive]}>
              Services
            </Text>
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.separator} />

          {/* All Jobs */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'jobs_all' && styles.menuItemActive]}
            onPress={() => handleModeSelect('jobs_all')}
            activeOpacity={0.7}
          >
            <View style={styles.textIcon}>
              <Text style={[styles.textIconLabel, mode === 'jobs_all' && styles.textIconLabelActive]}>J</Text>
            </View>
            <Text style={[styles.menuText, mode === 'jobs_all' && styles.menuTextActive]}>
              All Jobs
            </Text>
          </TouchableOpacity>

          {/* Fixed-priced Jobs */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'jobs_fixed' && styles.menuItemActive]}
            onPress={() => handleModeSelect('jobs_fixed')}
            activeOpacity={0.7}
          >
            <View style={styles.textIcon}>
              <Text style={[styles.textIconLabel, mode === 'jobs_fixed' && styles.textIconLabelActive]}>FJ</Text>
            </View>
            <Text style={[styles.menuText, mode === 'jobs_fixed' && styles.menuTextActive]}>
              Fixed-priced Jobs
            </Text>
          </TouchableOpacity>

          {/* Quoted Jobs */}
          <TouchableOpacity
            style={[styles.menuItem, mode === 'jobs_quoted' && styles.menuItemActive]}
            onPress={() => handleModeSelect('jobs_quoted')}
            activeOpacity={0.7}
          >
            <View style={styles.textIcon}>
              <Text style={[styles.textIconLabel, mode === 'jobs_quoted' && styles.textIconLabelActive]}>QJ</Text>
            </View>
            <Text style={[styles.menuText, mode === 'jobs_quoted' && styles.menuTextActive]}>
              Quoted Jobs
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
            <X size={24} color={colors.white} />
          ) : (
            <MapPin size={24} color={colors.white} />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Backdrop to close menu when tapping outside */}
      {expanded && (
        <Pressable style={styles.backdrop} onPress={toggleExpanded} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 999,
  },
  menuContainer: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
    alignItems: 'flex-end',
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
    ...shadows.md,
  },
  menuItemActive: {
    backgroundColor: colors.primary,
  },
  menuText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  menuTextActive: {
    color: colors.white,
  },
  textIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textIconLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  textIconLabelActive: {
    color: colors.white,
  },
  separator: {
    width: '80%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
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
