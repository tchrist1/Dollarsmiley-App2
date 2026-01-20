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
  // Total height of both FABs + gap = 37 + 10 + 37 = 84
  // Center is at 50% - 42, this FAB is 47dp below that (37 FAB + 10 gap)
  return (
    <View
      style={[
        styles.container,
        {
          top: '50%',
          marginTop: 5, // -42 + 37 + 10 = 5
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
                    outputRange: [-10, 0],
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
            <Layers size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Layers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onZoomIn)}
            activeOpacity={0.7}
          >
            <Plus size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Zoom In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onZoomOut)}
            activeOpacity={0.7}
          >
            <Minus size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Zoom Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onFullscreen)}
            activeOpacity={0.7}
          >
            <Maximize2 size={20} color={colors.text} />
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
            <X size={16} color={colors.white} />
          ) : (
            <MoreVertical size={16} color={colors.white} />
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
    overflow: 'visible',
  },
  actionsContainer: {
    position: 'absolute',
    top: 45,
    right: 0,
    gap: spacing.xs,
    alignItems: 'flex-end',
    minWidth: 150,
    overflow: 'visible',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    minHeight: 44,
    minWidth: 120,
    flexWrap: 'nowrap',
    ...shadows.md,
    elevation: 6,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  fab: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    backgroundColor: colors.primary + 'E0',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    elevation: 8,
  },
  fabExpanded: {
    backgroundColor: colors.error + 'E0',
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
