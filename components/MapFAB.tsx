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
  fabOpacity?: Animated.Value;
}

export default function MapFAB({
  onZoomIn,
  onZoomOut,
  onFullscreen,
  onLayersPress,
  fabOpacity,
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
  // Total height of both FABs + gap = 42 + 15 + 40 = 97
  // Center is at 50% - 46, this FAB is 57dp below that (42 FAB + 15 gap)
  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: '50%',
          marginTop: 11, // -46 + 42 + 15 = 11
          right: spacing.md,
          opacity: fabOpacity || 1,
        },
      ]}
      pointerEvents={fabOpacity && fabOpacity.__getValue() === 0 ? 'none' : 'auto'}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 999,
    overflow: 'visible',
  },
  actionsContainer: {
    position: 'absolute',
    top: 48,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + 'D9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  fabExpanded: {
    backgroundColor: colors.error + 'D9',
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
