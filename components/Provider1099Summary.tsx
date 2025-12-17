import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  DollarSign,
  Calendar,
} from 'lucide-react-native';
import { type Provider1099Summary, formatCurrency } from '@/lib/1099-nec-calculation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Provider1099SummaryCardProps {
  summary: Provider1099Summary;
  onPress?: () => void;
}

export default function Provider1099SummaryCard({
  summary,
  onPress,
}: Provider1099SummaryCardProps) {
  const getStatusIcon = () => {
    if (summary.is_ready_for_filing) {
      return <CheckCircle size={20} color={colors.success} />;
    }
    if (summary.meets_threshold && !summary.has_w9_on_file) {
      return <AlertCircle size={20} color={colors.warning} />;
    }
    if (!summary.meets_threshold) {
      return <XCircle size={20} color={colors.textSecondary} />;
    }
    return <FileText size={20} color={colors.textSecondary} />;
  };

  const getStatusText = () => {
    if (summary.is_ready_for_filing) {
      return 'Ready for Filing';
    }
    if (summary.meets_threshold && !summary.has_w9_on_file) {
      return 'W-9 Required';
    }
    if (!summary.meets_threshold) {
      return 'Below Threshold';
    }
    return 'Incomplete';
  };

  const getStatusColor = () => {
    if (summary.is_ready_for_filing) {
      return colors.success;
    }
    if (summary.meets_threshold && !summary.has_w9_on_file) {
      return colors.warning;
    }
    return colors.textSecondary;
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: getStatusColor() }]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.providerName}>
            {summary.business_name || summary.provider_name}
          </Text>
          {summary.business_name && (
            <Text style={styles.providerEmail}>{summary.provider_name}</Text>
          )}
        </View>
        <View style={styles.statusBadge}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.amountSection}>
        <DollarSign size={24} color={colors.primary} />
        <View style={styles.amountContent}>
          <Text style={styles.amountLabel}>Box 1: Nonemployee Compensation</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(summary.nonemployee_compensation)}
          </Text>
        </View>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        {summary.service_payments > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Service Payments</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(summary.service_payments)}
            </Text>
          </View>
        )}

        {summary.tips_received > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Tips</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(summary.tips_received)}
            </Text>
          </View>
        )}

        {summary.bonuses > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Bonuses</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(summary.bonuses)}</Text>
          </View>
        )}

        {summary.other_income > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Other Income</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(summary.other_income)}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>{summary.payment_count} payments</Text>
        </View>

        {summary.has_w9_on_file ? (
          <View style={styles.infoItem}>
            <CheckCircle size={14} color={colors.success} />
            <Text style={styles.infoText}>W-9 on file</Text>
          </View>
        ) : (
          <View style={styles.infoItem}>
            <XCircle size={14} color={colors.error} />
            <Text style={styles.infoText}>No W-9</Text>
          </View>
        )}

        {summary.meets_threshold && (
          <View style={styles.infoItem}>
            <CheckCircle size={14} color={colors.success} />
            <Text style={styles.infoText}>Meets $600</Text>
          </View>
        )}
      </View>

      {/* Warning for missing W-9 */}
      {summary.meets_threshold && !summary.has_w9_on_file && (
        <View style={styles.warningBox}>
          <AlertCircle size={16} color={colors.warning} />
          <Text style={styles.warningText}>
            W-9 required before 1099-NEC can be filed
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  providerEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  amountContent: {
    flex: 1,
  },
  amountLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  breakdown: {
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  warningBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.text,
  },
});
