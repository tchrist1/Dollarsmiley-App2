import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Minus, Maximize2, Layers, MoreVertical, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

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
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(scaleAnim, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    setExpanded(!expanded);
  };

  const handleAction = (action: () => void) => {
    action();
    toggleExpanded();
  };

  // Position at center-right, below the menu FAB
  // Total height of both FABs + gap = 40 + 10 + 40 = 90
  // Center is at 50% - 45, this FAB is 50dp below that (40 FAB + 10 gap)
  return (
    <View
      style={[
        styles.container,
        {
          top: '50%',
          marginTop: 5, // -45 + 40 + 10 = 5
          right: spacing.md,
        },
      ]}
    >
      {expanded && (
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: scaleAnim,
              transform: [
                {
                  translateY: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onLayersPress)}
            activeOpacity={0.7}
          >
            <Layers size={18} color={colors.text} />
            <Text style={styles.actionLabel}>Layers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onZoomIn)}
            activeOpacity={0.7}
          >
            <Plus size={18} color={colors.text} />
            <Text style={styles.actionLabel}>Zoom In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onZoomOut)}
            activeOpacity={0.7}
          >
            <Minus size={18} color={colors.text} />
            <Text style={styles.actionLabel}>Zoom Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onFullscreen)}
            activeOpacity={0.7}
          >
            <Maximize2 size={18} color={colors.text} />
            <Text style={styles.actionLabel}>Recenter</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

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
            <X size={20} color={colors.white} />
          ) : (
            <MoreVertical size={20} color={colors.white} />
          )}
        </Animated.View>
      </TouchableOpacity>

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
    zIndex: 1000,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 50,
    right: 0,
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    ...shadows.md,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    opacity: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  fabExpanded: {
    backgroundColor: colors.error,
    opacity: 0.95,
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
