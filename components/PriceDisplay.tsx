import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize } from '@/constants/theme';
import MultiRegionService from '@/lib/multi-region';

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  userId?: string;
  showOriginal?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function PriceDisplay({
  amount,
  currency = 'USD',
  userId,
  showOriginal = true,
  size = 'medium',
  style,
}: PriceDisplayProps) {
  const [displayData, setDisplayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriceDisplay();
  }, [amount, currency, userId]);

  const loadPriceDisplay = async () => {
    if (!userId) {
      const formatted = await MultiRegionService.formatCurrency(amount, currency);
      setDisplayData({
        formatted,
        isConverted: false,
      });
      setLoading(false);
      return;
    }

    try {
      const priceData = await MultiRegionService.getPreferredPriceDisplay(
        userId,
        amount,
        currency
      );
      setDisplayData(priceData);
    } catch (error) {
      console.error('Failed to load price display:', error);
      const formatted = await MultiRegionService.formatCurrency(amount, currency);
      setDisplayData({
        formatted,
        isConverted: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return fontSize.sm;
      case 'large':
        return fontSize.xl;
      default:
        return fontSize.lg;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!displayData) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.price, { fontSize: getFontSize() }]}>
        {displayData.formatted}
      </Text>

      {displayData.isConverted && showOriginal && (
        <Text style={styles.originalPrice}>
          ({Math.round(displayData.originalAmount || 0).toLocaleString('en-US')} {displayData.originalCurrency})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    fontWeight: '700',
    color: colors.text,
  },
  originalPrice: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});