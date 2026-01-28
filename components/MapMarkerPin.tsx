import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Briefcase, Sparkles } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';

export type MarkerType = 'Service' | 'CustomService' | 'Job';

interface MapMarkerPinProps {
  type: MarkerType;
  price?: number;
  isSelected?: boolean;
  isNearby?: boolean;
  onPress?: () => void;
}

const getMarkerConfig = (type: MarkerType) => {
  switch (type) {
    case 'Service':
      return {
        bubbleColor: '#10B981',
        bubbleColorLight: '#D1FAE5',
        shadowColor: '#10B981',
        icon: MapPin,
        label: 'Service',
      };
    case 'CustomService':
      return {
        bubbleColor: '#8B5CF6',
        bubbleColorLight: '#EDE9FE',
        shadowColor: '#8B5CF6',
        icon: Sparkles,
        label: 'Custom',
      };
    case 'Job':
      return {
        bubbleColor: '#F59E0B',
        bubbleColorLight: '#FEF3C7',
        shadowColor: '#F59E0B',
        icon: Briefcase,
        label: 'Job',
      };
  }
};

export function MapMarkerPin({ type, price, isSelected = false, isNearby = false, onPress }: MapMarkerPinProps) {
  const config = getMarkerConfig(type);
  const Icon = config.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 25, bottom: 35, left: 25, right: 25 }}
      style={[styles.container, isNearby && styles.containerNearby]}
      pointerEvents="box-only"
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isSelected ? config.bubbleColor : colors.white,
            borderColor: config.bubbleColor,
            shadowColor: config.shadowColor,
          },
          isSelected && styles.bubbleSelected,
          isNearby && styles.bubbleNearby,
        ]}
        pointerEvents="none"
      >
        <Icon
          size={20}
          color={isSelected ? colors.white : config.bubbleColor}
          strokeWidth={2.5}
        />
      </View>

      <View style={[styles.pointer, { borderTopColor: config.bubbleColor }]} pointerEvents="none" />

      {(price !== undefined || type === 'Job') && (
        <View
          style={[
            styles.priceTag,
            {
              backgroundColor: isSelected ? config.bubbleColor : colors.white,
              borderColor: config.bubbleColor,
            },
          ]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.priceText,
              { color: isSelected ? colors.white : config.bubbleColor },
            ]}
          >
            {price !== undefined ? formatCurrency(price) : 'Quote'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 80,
  },
  bubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  bubbleSelected: {
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  pointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  priceTag: {
    position: 'absolute',
    bottom: -28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  priceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  containerNearby: {
    opacity: 0.6,
  },
  bubbleNearby: {
    borderStyle: 'dashed',
  },
});
