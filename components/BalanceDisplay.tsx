import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  DollarSign,
  Clock,
  Eye,
  EyeOff,
  Info,
  TrendingUp,
  CheckCircle,
  X,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface BalanceDisplayProps {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  currency?: string;
  showDetails?: boolean;
}

export default function BalanceDisplay({
  availableBalance,
  pendingBalance,
  totalEarned,
  totalWithdrawn,
  currency = 'USD',
  showDetails = true,
}: BalanceDisplayProps) {
  const [showBalance, setShowBalance] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const formatCurrency = (amount: number): string => {
    if (!showBalance) return '••••••';

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amount);
  };

  const totalBalance = availableBalance + pendingBalance;

  return (
    <View style={styles.container}>
      {/* Main Balance Card */}
      <View style={styles.mainCard}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <DollarSign size={24} color={colors.white} />
            <Text style={styles.headerTitle}>Total Balance</Text>
          </View>
          <TouchableOpacity
            style={styles.visibilityButton}
            onPress={() => setShowBalance(!showBalance)}
          >
            {showBalance ? (
              <Eye size={20} color={colors.white} />
            ) : (
              <EyeOff size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.mainAmount}>{formatCurrency(totalBalance)}</Text>

        {/* Balance Breakdown */}
        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <CheckCircle size={16} color={colors.white + 'CC'} />
              <Text style={styles.breakdownLabel}>Available</Text>
            </View>
            <Text style={styles.breakdownAmount}>{formatCurrency(availableBalance)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <Clock size={16} color={colors.white + 'CC'} />
              <Text style={styles.breakdownLabel}>Pending</Text>
            </View>
            <Text style={styles.breakdownAmount}>{formatCurrency(pendingBalance)}</Text>
          </View>
        </View>

        {/* Info Button */}
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => setShowInfoModal(true)}
        >
          <Info size={16} color={colors.white + 'CC'} />
          <Text style={styles.infoButtonText}>What does this mean?</Text>
        </TouchableOpacity>
      </View>

      {/* Details Cards */}
      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <TrendingUp size={20} color={colors.success} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Total Earned</Text>
              <Text style={styles.detailAmount}>{formatCurrency(totalEarned)}</Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <DollarSign size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Total Withdrawn</Text>
              <Text style={styles.detailAmount}>{formatCurrency(totalWithdrawn)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Balance Breakdown</Text>
            <TouchableOpacity onPress={() => setShowInfoModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Available Balance */}
            <View style={styles.infoSection}>
              <View style={styles.infoSectionHeader}>
                <CheckCircle size={24} color={colors.success} />
                <Text style={styles.infoSectionTitle}>Available Balance</Text>
              </View>
              <Text style={styles.infoSectionAmount}>
                {formatCurrency(availableBalance)}
              </Text>
              <Text style={styles.infoSectionDescription}>
                This is money you can withdraw right now. It includes all completed
                transactions that have cleared and are ready for payout.
              </Text>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>You can use this for:</Text>
                <Text style={styles.infoCardText}>
                  • Requesting payouts{'\n'}
                  • Immediate withdrawal{'\n'}
                  • Transfer to your bank account{'\n'}
                  • Available 24/7
                </Text>
              </View>
            </View>

            {/* Pending Balance */}
            <View style={styles.infoSection}>
              <View style={styles.infoSectionHeader}>
                <Clock size={24} color={colors.warning} />
                <Text style={styles.infoSectionTitle}>Pending Balance</Text>
              </View>
              <Text style={styles.infoSectionAmount}>
                {formatCurrency(pendingBalance)}
              </Text>
              <Text style={styles.infoSectionDescription}>
                This is money from recent transactions that is being processed. It will
                become available once the transactions are completed and verified.
              </Text>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Why is money pending?</Text>
                <Text style={styles.infoCardText}>
                  • Recent bookings (within 24 hours){'\n'}
                  • Escrow holds for ongoing services{'\n'}
                  • Payment verification in progress{'\n'}
                  • Dispute resolution period
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>When will it be available?</Text>
                <Text style={styles.infoCardText}>
                  Most pending funds become available within 1-3 business days after the
                  service is completed. Funds held in escrow are released when both
                  parties confirm completion.
                </Text>
              </View>
            </View>

            {/* Total Balance */}
            <View style={styles.infoSection}>
              <View style={styles.infoSectionHeader}>
                <DollarSign size={24} color={colors.primary} />
                <Text style={styles.infoSectionTitle}>Total Balance</Text>
              </View>
              <Text style={styles.infoSectionAmount}>
                {formatCurrency(totalBalance)}
              </Text>
              <Text style={styles.infoSectionDescription}>
                This is the sum of your available and pending balances. It represents all
                the money in your wallet, both ready for withdrawal and being processed.
              </Text>
            </View>

            {/* Lifetime Stats */}
            <View style={styles.infoSection}>
              <View style={styles.infoSectionHeader}>
                <TrendingUp size={24} color={colors.text} />
                <Text style={styles.infoSectionTitle}>Lifetime Statistics</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Earned</Text>
                <Text style={styles.statValue}>{formatCurrency(totalEarned)}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Withdrawn</Text>
                <Text style={styles.statValue}>{formatCurrency(totalWithdrawn)}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Current Balance</Text>
                <Text style={[styles.statValue, styles.statValuePrimary]}>
                  {formatCurrency(totalBalance)}
                </Text>
              </View>
            </View>

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsSectionTitle}>Tips</Text>
              <View style={styles.tipCard}>
                <Text style={styles.tipText}>
                  💡 Request payouts regularly to keep your available balance low and money
                  flowing to your account.
                </Text>
              </View>
              <View style={styles.tipCard}>
                <Text style={styles.tipText}>
                  💡 Pending funds will automatically become available once transactions
                  clear - no action needed.
                </Text>
              </View>
              <View style={styles.tipCard}>
                <Text style={styles.tipText}>
                  💡 Set up automatic payouts in settings to receive funds without manual
                  requests.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  mainCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white + 'CC',
  },
  visibilityButton: {
    padding: spacing.xs,
  },
  mainAmount: {
    fontSize: fontSize.xxxl + 8,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  breakdown: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  breakdownItem: {
    flex: 1,
    gap: spacing.xs,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.white + 'CC',
  },
  breakdownAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  divider: {
    width: 1,
    backgroundColor: colors.white + '30',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  infoButtonText: {
    fontSize: fontSize.sm,
    color: colors.white + 'CC',
  },
  detailsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  detailAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  infoSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  infoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  infoSectionAmount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  infoSectionDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  infoCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  infoCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  infoCardText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statValuePrimary: {
    color: colors.primary,
    fontSize: fontSize.lg,
  },
  tipsSection: {
    gap: spacing.sm,
  },
  tipsSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tipCard: {
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
