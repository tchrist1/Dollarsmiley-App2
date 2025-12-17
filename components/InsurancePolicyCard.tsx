import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  Shield,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
} from 'lucide-react-native';
import {
  getInsuranceTypeDisplay,
  getInsuranceStatusColor,
  getVerificationStatusColor,
  formatCoverageAmount,
  isInsuranceExpired,
  isInsuranceExpiringSoon,
  getDaysUntilExpiration,
  type BusinessInsurance,
} from '@/lib/business-insurance';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface InsurancePolicyCardProps {
  insurance: BusinessInsurance;
  onPress?: () => void;
  onViewCertificate?: () => void;
  compact?: boolean;
}

export default function InsurancePolicyCard({
  insurance,
  onPress,
  onViewCertificate,
  compact = false,
}: InsurancePolicyCardProps) {
  const statusColor = getInsuranceStatusColor(insurance.status);
  const verificationColor = getVerificationStatusColor(
    insurance.verification_status
  );
  const isExpired = isInsuranceExpired(insurance);
  const isExpiring = isInsuranceExpiringSoon(insurance);
  const daysUntilExpiry = getDaysUntilExpiration(insurance);

  const getVerificationIcon = () => {
    if (insurance.verification_status === 'Verified') {
      return <CheckCircle size={16} color={colors.success} />;
    } else if (insurance.verification_status === 'Rejected') {
      return <XCircle size={16} color={colors.error} />;
    } else {
      return <AlertCircle size={16} color={colors.warning} />;
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderLeftColor: statusColor }]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.compactHeader}>
          <Shield size={20} color={statusColor} />
          <View style={styles.compactInfo}>
            <Text style={styles.compactTitle}>
              {getInsuranceTypeDisplay(insurance.insurance_type)}
            </Text>
            <Text style={styles.compactSubtitle}>
              {insurance.provider_name}
            </Text>
          </View>
          <View style={styles.compactRight}>
            <Text style={styles.compactCoverage}>
              {formatCoverageAmount(insurance.coverage_amount)}
            </Text>
            {getVerificationIcon()}
          </View>
        </View>

        {(isExpired || isExpiring) && (
          <View style={styles.compactWarning}>
            <AlertCircle size={12} color={colors.warning} />
            <Text style={styles.compactWarningText}>
              {isExpired ? 'Expired' : `Expires in ${daysUntilExpiry} days`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderLeftColor: statusColor },
        isExpired && styles.expiredContainer,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Shield size={24} color={statusColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>
            {getInsuranceTypeDisplay(insurance.insurance_type)}
          </Text>
          <Text style={styles.provider}>{insurance.provider_name}</Text>
        </View>
        <View
          style={[
            styles.verificationBadge,
            { backgroundColor: verificationColor + '20' },
          ]}
        >
          {getVerificationIcon()}
          <Text style={[styles.verificationText, { color: verificationColor }]}>
            {insurance.verification_status}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Policy Number</Text>
            <Text style={styles.detailValue}>{insurance.policy_number}</Text>
          </View>
          <View style={styles.detailItem}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={styles.coverageAmount}>
              {formatCoverageAmount(insurance.coverage_amount)}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <View>
              <Text style={styles.dateLabel}>Effective</Text>
              <Text style={styles.dateValue}>
                {new Date(insurance.effective_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.dateItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <View>
              <Text style={styles.dateLabel}>Expires</Text>
              <Text
                style={[
                  styles.dateValue,
                  (isExpired || isExpiring) && {
                    color: isExpired ? colors.error : colors.warning,
                    fontWeight: fontWeight.bold,
                  },
                ]}
              >
                {new Date(insurance.expiration_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {(isExpired || isExpiring) && (
          <View style={styles.warningBanner}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={styles.warningText}>
              {isExpired
                ? 'This policy has expired'
                : `Expires in ${daysUntilExpiry} days - Renew soon`}
            </Text>
          </View>
        )}

        {insurance.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notes}>{insurance.notes}</Text>
          </View>
        )}
      </View>

      {insurance.certificate_url && onViewCertificate && (
        <TouchableOpacity
          style={styles.certificateButton}
          onPress={onViewCertificate}
        >
          <FileText size={16} color={colors.primary} />
          <Text style={styles.certificateButtonText}>View Certificate</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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
  expiredContainer: {
    opacity: 0.7,
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
  provider: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  compactSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  verificationText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  compactRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  compactCoverage: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  content: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
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
  coverageAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  dateValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  compactWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },
  compactWarningText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.warning,
  },
  notesContainer: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  notes: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  certificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  certificateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
