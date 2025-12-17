import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  DollarSign,
  Star,
  CheckCircle,
  Clock,
  Award,
  Shield,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Provider {
  id: string;
  full_name: string;
  rating_average: number;
  rating_count: number;
  total_bookings: number;
}

interface Quote {
  id: string;
  price: number;
  created_at: string;
  provider: Provider;
}

interface QuoteSideBySideProps {
  quotes: [Quote, Quote];
  onClose: () => void;
  onSelect: (quoteId: string) => void;
}

export function QuoteSideBySide({ quotes, onClose, onSelect }: QuoteSideBySideProps) {
  const [quote1, quote2] = quotes;

  const comparisonRows = [
    {
      label: 'Price',
      icon: DollarSign,
      value1: `$${Math.round(quote1.price).toLocaleString('en-US')}`,
      value2: `$${Math.round(quote2.price).toLocaleString('en-US')}`,
      better: quote1.price < quote2.price ? 'left' : quote1.price > quote2.price ? 'right' : 'tie',
    },
    {
      label: 'Rating',
      icon: Star,
      value1:
        quote1.provider.rating_count > 0
          ? `${quote1.provider.rating_average.toFixed(1)} ⭐`
          : 'No ratings',
      value2:
        quote2.provider.rating_count > 0
          ? `${quote2.provider.rating_average.toFixed(1)} ⭐`
          : 'No ratings',
      better:
        quote1.provider.rating_average > quote2.provider.rating_average
          ? 'left'
          : quote1.provider.rating_average < quote2.provider.rating_average
          ? 'right'
          : 'tie',
    },
    {
      label: 'Reviews',
      icon: Award,
      value1: `${quote1.provider.rating_count} reviews`,
      value2: `${quote2.provider.rating_count} reviews`,
      better:
        quote1.provider.rating_count > quote2.provider.rating_count
          ? 'left'
          : quote1.provider.rating_count < quote2.provider.rating_count
          ? 'right'
          : 'tie',
    },
    {
      label: 'Experience',
      icon: TrendingUp,
      value1: `${quote1.provider.total_bookings} jobs`,
      value2: `${quote2.provider.total_bookings} jobs`,
      better:
        quote1.provider.total_bookings > quote2.provider.total_bookings
          ? 'left'
          : quote1.provider.total_bookings < quote2.provider.total_bookings
          ? 'right'
          : 'tie',
    },
    {
      label: 'Response Time',
      icon: Clock,
      value1: new Date(quote1.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value2: new Date(quote2.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      better:
        new Date(quote1.created_at) < new Date(quote2.created_at)
          ? 'left'
          : new Date(quote1.created_at) > new Date(quote2.created_at)
          ? 'right'
          : 'tie',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Compare Quotes</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Provider Names */}
            <View style={styles.providerRow}>
              <View style={styles.providerCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {quote1.provider.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.providerName} numberOfLines={2}>
                  {quote1.provider.full_name}
                </Text>
              </View>
              <View style={styles.vs}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <View style={styles.providerCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {quote2.provider.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.providerName} numberOfLines={2}>
                  {quote2.provider.full_name}
                </Text>
              </View>
            </View>

            {/* Comparison Table */}
            <View style={styles.comparisonTable}>
              {comparisonRows.map((row, index) => {
                const IconComponent = row.icon;
                return (
                  <View key={index} style={styles.comparisonRow}>
                    <View style={styles.labelCell}>
                      <IconComponent size={16} color={colors.textSecondary} />
                      <Text style={styles.labelText}>{row.label}</Text>
                    </View>
                    <View
                      style={[
                        styles.valueCell,
                        row.better === 'left' && styles.valueCellBetter,
                      ]}
                    >
                      <Text
                        style={[
                          styles.valueText,
                          row.better === 'left' && styles.valueTextBetter,
                        ]}
                      >
                        {row.value1}
                      </Text>
                      {row.better === 'left' && (
                        <CheckCircle size={16} color={colors.success} />
                      )}
                    </View>
                    <View
                      style={[
                        styles.valueCell,
                        row.better === 'right' && styles.valueCellBetter,
                      ]}
                    >
                      <Text
                        style={[
                          styles.valueText,
                          row.better === 'right' && styles.valueTextBetter,
                        ]}
                      >
                        {row.value2}
                      </Text>
                      {row.better === 'right' && (
                        <CheckCircle size={16} color={colors.success} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => onSelect(quote1.id)}
            >
              <Text style={styles.selectButtonText}>Select {quote1.provider.full_name}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => onSelect(quote2.id)}
            >
              <Text style={styles.selectButtonText}>Select {quote2.provider.full_name}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  providerCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  vs: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  comparisonTable: {
    gap: spacing.xs,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labelCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  labelText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  valueCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  valueCellBetter: {
    backgroundColor: colors.success + '15',
  },
  valueText: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  valueTextBetter: {
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
