import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { List, LayoutGrid, Map } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';

interface ViewModeToggleProps {
  viewMode: 'list' | 'grid' | 'map';
  onChangeViewMode: (mode: 'list' | 'grid' | 'map') => void;
}

export const ViewModeToggle = memo<ViewModeToggleProps>(({
  viewMode,
  onChangeViewMode,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, viewMode === 'grid' && styles.buttonActive]}
        onPress={() => onChangeViewMode('grid')}
        activeOpacity={0.7}
      >
        <LayoutGrid
          size={20}
          color={viewMode === 'grid' ? colors.white : colors.textLight}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, viewMode === 'list' && styles.buttonActive]}
        onPress={() => onChangeViewMode('list')}
        activeOpacity={0.7}
      >
        <List
          size={20}
          color={viewMode === 'list' ? colors.white : colors.textLight}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, viewMode === 'map' && styles.buttonActive]}
        onPress={() => onChangeViewMode('map')}
        activeOpacity={0.7}
      >
        <Map
          size={20}
          color={viewMode === 'map' ? colors.white : colors.textLight}
        />
      </TouchableOpacity>
    </View>
  );
});

ViewModeToggle.displayName = 'ViewModeToggle';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  buttonActive: {
    backgroundColor: colors.primary,
  },
});
