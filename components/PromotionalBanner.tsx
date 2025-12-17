import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Tag, Clock, TrendingUp, Gift, Percent } from 'lucide-react-native';
import {
  type PromotionalCampaign,
  formatDiscount,
  getCampaignTypeLabel,
} from '@/lib/promotional-campaigns';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface PromotionalBannerProps {
  campaign: PromotionalCampaign;
  onPress?: () => void;
  variant?: 'full' | 'compact';
}

export default function PromotionalBanner({
  campaign,
  onPress,
  variant = 'full',
}: PromotionalBannerProps) {
  const getCampaignIcon = () => {
    switch (campaign.campaign_type) {
      case 'referral':
        return <TrendingUp size={24} color={colors.white} />;
      case 'seasonal':
        return <Gift size={24} color={colors.white} />;
      case 'first_time':
        return <Tag size={24} color={colors.white} />;
      case 'loyalty':
        return <Percent size={24} color={colors.white} />;
      default:
        return <Tag size={24} color={colors.white} />;
    }
  };

  const getGradientColors = () => {
    switch (campaign.campaign_type) {
      case 'referral':
        return ['#3B82F6', '#2563EB']; // Blue
      case 'seasonal':
        return ['#10B981', '#059669']; // Green
      case 'first_time':
        return ['#F59E0B', '#D97706']; // Orange
      case 'loyalty':
        return ['#8B5CF6', '#7C3AED']; // Purple
      default:
        return ['#EF4444', '#DC2626']; // Red
    }
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const endDate = new Date(campaign.end_date);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  const getUsagePercentage = () => {
    if (!campaign.total_usage_limit) return null;
    return (campaign.current_usage / campaign.total_usage_limit) * 100;
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactBanner, { backgroundColor: getGradientColors()[0] }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.compactIcon}>{getCampaignIcon()}</View>
        <View style={styles.compactContent}>
          <Text style={styles.compactDiscount}>{formatDiscount(campaign)}</Text>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {campaign.name}
          </Text>
        </View>
        <View style={styles.compactArrow}>
          <Text style={styles.compactArrowText}>→</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const daysRemaining = getDaysRemaining();
  const usagePercentage = getUsagePercentage();
  const [primaryColor, secondaryColor] = getGradientColors();

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: primaryColor }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.bannerOverlay} />

      <View style={styles.bannerHeader}>
        <View style={styles.bannerIcon}>{getCampaignIcon()}</View>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>{getCampaignTypeLabel(campaign.campaign_type)}</Text>
        </View>
      </View>

      <View style={styles.bannerContent}>
        <Text style={styles.bannerDiscount}>{formatDiscount(campaign)}</Text>
        <Text style={styles.bannerTitle}>{campaign.name}</Text>
        <Text style={styles.bannerDescription} numberOfLines={2}>
          {campaign.description}
        </Text>
      </View>

      <View style={styles.bannerFooter}>
        <View style={styles.bannerTimeLeft}>
          <Clock size={14} color={colors.white} />
          <Text style={styles.bannerTimeText}>
            {daysRemaining > 0
              ? `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left`
              : 'Ending soon'}
          </Text>
        </View>

        {usagePercentage !== null && (
          <View style={styles.bannerUsage}>
            <Text style={styles.bannerUsageText}>
              {campaign.current_usage}/{campaign.total_usage_limit} used
            </Text>
          </View>
        )}
      </View>

      {usagePercentage !== null && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: usagePercentage > 90 ? colors.error : colors.white,
              },
            ]}
          />
        </View>
      )}

      {campaign.min_order_value && (
        <View style={styles.bannerMinOrder}>
          <Text style={styles.bannerMinOrderText}>
            Min. order: ${campaign.min_order_value}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  bannerBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  bannerContent: {
    marginBottom: spacing.md,
  },
  bannerDiscount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  bannerDescription: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  bannerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bannerTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bannerTimeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  bannerUsage: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  bannerUsageText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  bannerMinOrder: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  bannerMinOrderText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  compactIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  compactContent: {
    flex: 1,
  },
  compactDiscount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  compactArrow: {
    marginLeft: spacing.sm,
  },
  compactArrowText: {
    fontSize: fontSize.xl,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
});
