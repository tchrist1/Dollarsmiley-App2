import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { getFeatureComparison } from '@/lib/subscriptions';

interface SubscriptionComparisonProps {
  highlightPlan?: 'Free' | 'Pro' | 'Premium' | 'Elite';
}

export default function SubscriptionComparison({ highlightPlan }: SubscriptionComparisonProps) {
  const comparison = getFeatureComparison();

  const renderValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check size={20} color={colors.success} />
      ) : (
        <X size={20} color={colors.textLight} />
      );
    }
    return <Text style={styles.featureValue}>{value}</Text>;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {comparison.features.map((category, categoryIndex) => (
        <View key={categoryIndex} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category.category}</Text>

          {category.items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.featureRow}>
              <View style={styles.featureName}>
                <Text style={styles.featureNameText}>{item.name}</Text>
              </View>

              <View
                style={[
                  styles.featureCell,
                  highlightPlan === 'Free' && styles.featureCellHighlight,
                ]}
              >
                {renderValue(item.free)}
              </View>

              <View
                style={[
                  styles.featureCell,
                  highlightPlan === 'Pro' && styles.featureCellHighlight,
                ]}
              >
                {renderValue(item.pro)}
              </View>

              <View
                style={[
                  styles.featureCell,
                  highlightPlan === 'Premium' && styles.featureCellHighlight,
                ]}
              >
                {renderValue(item.premium)}
              </View>

              <View
                style={[
                  styles.featureCell,
                  highlightPlan === 'Elite' && styles.featureCellHighlight,
                ]}
              >
                {renderValue(item.elite)}
              </View>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All plans include secure payments, escrow protection, and dispute resolution.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  featureName: {
    flex: 2,
    paddingLeft: spacing.md,
  },
  featureNameText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  featureCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  featureCellHighlight: {
    backgroundColor: colors.primaryLight,
  },
  featureValue: {
    fontSize: fontSize.xs,
    color: colors.text,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    margin: spacing.md,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
