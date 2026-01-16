import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, User } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';

interface MapModeBarProps {
  mode: 'listings' | 'providers';
  onModeChange: (mode: 'listings' | 'providers') => void;
}

export default function MapModeBar({ mode, onModeChange }: MapModeBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.pillContainer}>
        <TouchableOpacity
          style={[styles.button, mode === 'listings' && styles.buttonActive]}
          onPress={() => onModeChange('listings')}
          activeOpacity={0.7}
        >
          <MapPin
            size={18}
            color={mode === 'listings' ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.buttonText, mode === 'listings' && styles.buttonTextActive]}>
            Listings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, mode === 'providers' && styles.buttonActive]}
          onPress={() => onModeChange('providers')}
          activeOpacity={0.7}
        >
          <User
            size={18}
            color={mode === 'providers' ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.buttonText, mode === 'providers' && styles.buttonTextActive]}>
            Providers
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    alignItems: 'center',
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    ...shadows.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minHeight: 44,
    gap: spacing.xs,
  },
  buttonActive: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  buttonTextActive: {
    color: colors.white,
  },
});
