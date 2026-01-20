import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Plus, Minus, Maximize2, Layers } from 'lucide-react-native';
import { colors, spacing, shadows } from '@/constants/theme';

interface MapFABProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreen: () => void;
  onLayersPress: () => void;
}

export default function MapFAB({
  onZoomIn,
  onZoomOut,
  onFullscreen,
  onLayersPress,
}: MapFABProps) {
  // Position at center-right, below the menu FAB
  // Total height of both FABs + gap = 37 + 10 + 37 = 84
  // Center is at 50% - 42, this FAB is 47dp below that (37 FAB + 10 gap)
  return (
    <View
      style={[
        styles.container,
        {
          top: '50%',
          marginTop: 5,
          right: spacing.md,
        },
      ]}
    >
      <View style={styles.buttonStack}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onLayersPress}
          activeOpacity={0.7}
        >
          <Layers size={16} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onZoomIn}
          activeOpacity={0.7}
        >
          <Plus size={16} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onZoomOut}
          activeOpacity={0.7}
        >
          <Minus size={16} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onFullscreen}
          activeOpacity={0.7}
        >
          <Maximize2 size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  buttonStack: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  actionButton: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
});
