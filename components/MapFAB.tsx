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
  const menuAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;

    Animated.parallel([
      Animated.spring(menuAnim, {
        toValue,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
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

  const handleAction = (action: () => void) => {
    action();
    toggleExpanded();
  };

  // Position at center-right, below the menu FAB
  // Total height of both FABs + gap = 44 + 15 + 42 = 101
  // Center is at 50% - 46, this FAB is 59dp below that (44 FAB + 15 gap)
  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: '50%',
          marginTop: 13, // -46 + 44 + 15 = 13
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
            styles.actionsContainer,
            {
              opacity: menuAnim,
              transform: [
                {
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onLayersPress)}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <Layers size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Layers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onZoomIn)}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <Plus size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Zoom In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onZoomOut)}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <Minus size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Zoom Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(onFullscreen)}
            activeOpacity={0.7}
            pointerEvents="auto"
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
        pointerEvents="auto"
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
            <MoreVertical size={16} color="rgba(255, 255, 255, 0.95)" />
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
    zIndex: 9999,
    elevation: 9999,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 10000,
    zIndex: 10000,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 185, 129, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10000,
    zIndex: 10000,
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
