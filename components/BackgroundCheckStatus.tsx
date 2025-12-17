import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  FileText,
  Calendar,
} from 'lucide-react-native';
import {
  getCheckStatusColor,
  getCheckResultColor,
  getDaysUntilExpiration,
  isBackgroundCheckExpired,
  isBackgroundCheckExpiringSoon,
  getResultDescription,
  type BackgroundCheck,
} from '@/lib/background-checks';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface BackgroundCheckStatusProps {
  check: BackgroundCheck;
  onViewDetails?: () => void;
  onRenew?: () => void;
  compact?: boolean;
}

export default function BackgroundCheckStatus({
  check,
  onViewDetails,
  onRenew,
  compact = false,
}: BackgroundCheckStatusProps) {
  const statusColor = getCheckStatusColor(check.status);
  const resultColor = check.result ? getCheckResultColor(check.result) : undefined;
  const isExpired = isBackgroundCheckExpired(check);
  const isExpiring = isBackgroundCheckExpiringSoon(check);
  const daysUntilExpiry = getDaysUntilExpiration(check);

  const getStatusIcon = () => {
    if (check.status === 'Completed' && check.result) {
      if (check.result === 'Clear') {
        return <CheckCircle size={compact ? 20 : 24} color={colors.success} />;
      } else if (check.result === 'Consider') {
        return <AlertCircle size={compact ? 20 : 24} color={colors.warning} />;
      } else {
        return <XCircle size={compact ? 20 : 24} color={colors.error} />;
      }
    }

    switch (check.status) {
      case 'InProgress':
      case 'Pending':
        return <Clock size={compact ? 20 : 24} color={colors.warning} />;
      case 'Failed':
        return <XCircle size={compact ? 20 : 24} color={colors.error} />;
      default:
        return <FileText size={compact ? 20 : 24} color={colors.textSecondary} />;
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderLeftColor: statusColor }]}>
        <View style={styles.compactHeader}>
          {getStatusIcon()}
          <View style={styles.compactInfo}>
            <Text style={styles.compactTitle}>Background Check</Text>
            <Text style={[styles.compactStatus, { color: statusColor }]}>
              {check.status}
            </Text>
          </View>
          {check.result && (
            <View
              style={[
                styles.compactResultBadge,
                { backgroundColor: resultColor + '20' },
              ]}
            >
              <Text style={[styles.compactResultText, { color: resultColor }]}>
                {check.result}
              </Text>
            </View>
          )}
        </View>

        {(isExpired || isExpiring) && (
          <View style={styles.compactWarning}>
            <AlertCircle size={14} color={colors.warning} />
            <Text style={styles.compactWarningText}>
              {isExpired ? 'Expired' : `Expires in ${daysUntilExpiry} days`}
            </Text>
            {onRenew && (
              <TouchableOpacity onPress={onRenew}>
                <Text style={styles.compactRenewText}>Renew</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>{getStatusIcon()}</View>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Background Check</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {check.status}
          </Text>
        </View>
        {check.result && (
          <View
            style={[styles.resultBadge, { backgroundColor: resultColor + '20' }]}
          >
            <Text style={[styles.resultText, { color: resultColor }]}>
              {check.result}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{check.check_type}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Provider</Text>
          <Text style={styles.detailValue}>{check.service_provider}</Text>
        </View>

        {check.initiated_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Initiated</Text>
            <Text style={styles.detailValue}>
              {new Date(check.initiated_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {check.completed_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Completed</Text>
            <Text style={styles.detailValue}>
              {new Date(check.completed_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {check.expires_at && (
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Expires</Text>
            </View>
            <Text
              style={[
                styles.detailValue,
                (isExpired || isExpiring) && {
                  color: isExpired ? colors.error : colors.warning,
                  fontWeight: fontWeight.bold,
                },
              ]}
            >
              {new Date(check.expires_at).toLocaleDateString()}
              {daysUntilExpiry !== null &&
                !isExpired &&
                ` (${daysUntilExpiry} days)`}
            </Text>
          </View>
        )}
      </View>

      {check.result && check.status === 'Completed' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultDescription}>
            {getResultDescription(check.result)}
          </Text>
        </View>
      )}

      {(isExpired || isExpiring) && (
        <View style={styles.warningCard}>
          <AlertCircle size={20} color={colors.warning} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>
              {isExpired ? 'Background Check Expired' : 'Expiring Soon'}
            </Text>
            <Text style={styles.warningText}>
              {isExpired
                ? 'Your background check has expired. Renew it to continue providing services.'
                : `Your background check will expire in ${daysUntilExpiry} days. Renew it before expiration.`}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        {onViewDetails && (
          <TouchableOpacity style={styles.actionButton} onPress={onViewDetails}>
            <FileText size={16} color={colors.primary} />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
        )}

        {(isExpired || isExpiring) && onRenew && (
          <TouchableOpacity
            style={[styles.actionButton, styles.renewButton]}
            onPress={onRenew}
          >
            <Text style={styles.renewButtonText}>Renew Check</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  compactContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  compactInfo: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  compactTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  status: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  compactStatus: {
    fontSize: fontSize.sm,
  },
  resultBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  compactResultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  resultText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  compactResultText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  content: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  resultContainer: {
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  resultDescription: {
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  compactWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  warningContent: {
    flex: 1,
    gap: spacing.xs,
  },
  warningTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 20,
  },
  compactWarningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  compactRenewText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  renewButton: {
    backgroundColor: colors.primary,
  },
  renewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
