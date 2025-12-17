import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Star,
  CheckCircle,
  Clock,
  DollarSign,
  Award,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Provider {
  id: string;
  full_name: string;
  rating_average: number;
  rating_count: number;
  total_bookings: number;
  bio?: string;
  response_time?: number;
  acceptance_rate?: number;
}

interface QuoteComparisonCardProps {
  quote: {
    id: string;
    price: number;
    created_at: string;
    provider: Provider;
  };
  isLowestPrice?: boolean;
  isHighestRated?: boolean;
  isFastest?: boolean;
  onAccept: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
  accepting?: boolean;
}

export function QuoteComparisonCard({
  quote,
  isLowestPrice,
  isHighestRated,
  isFastest,
  onAccept,
  onMessage,
  onViewProfile,
  accepting,
}: QuoteComparisonCardProps) {
  const badges = [];
  if (isLowestPrice) badges.push({ label: 'Best Value', icon: DollarSign, color: colors.success });
  if (isHighestRated) badges.push({ label: 'Top Rated', icon: Award, color: colors.warning });
  if (isFastest) badges.push({ label: 'Quick Response', icon: Zap, color: colors.primary });

  const hasVerification = quote.provider.rating_count > 10;
  const isExperienced = quote.provider.total_bookings > 50;

  return (
    <View style={[styles.card, badges.length > 0 && styles.cardHighlighted]}>
      {/* Badges */}
      {badges.length > 0 && (
        <View style={styles.badgeContainer}>
          {badges.map((badge, index) => {
            const IconComponent = badge.icon;
            return (
              <View key={index} style={[styles.badge, { backgroundColor: badge.color + '15' }]}>
                <IconComponent size={14} color={badge.color} />
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Provider Header */}
      <TouchableOpacity style={styles.providerHeader} onPress={onViewProfile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{quote.provider.full_name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.providerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{quote.provider.full_name}</Text>
            {hasVerification && <Shield size={16} color={colors.success} />}
          </View>

          {/* Rating */}
          {quote.provider.rating_count > 0 ? (
            <View style={styles.ratingRow}>
              <View style={styles.ratingStars}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    color={i < Math.round(quote.provider.rating_average) ? colors.warning : colors.border}
                    fill={i < Math.round(quote.provider.rating_average) ? colors.warning : 'transparent'}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>
                {quote.provider.rating_average.toFixed(1)} ({quote.provider.rating_count})
              </Text>
            </View>
          ) : (
            <Text style={styles.newProviderText}>New Provider</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <CheckCircle size={12} color={colors.success} />
              <Text style={styles.statText}>{quote.provider.total_bookings} jobs</Text>
            </View>
            {isExperienced && (
              <View style={styles.experienceBadge}>
                <TrendingUp size={12} color={colors.primary} />
                <Text style={styles.experienceText}>Experienced</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Bio */}
      {quote.provider.bio && (
        <View style={styles.bioSection}>
          <Text style={styles.bioText} numberOfLines={3}>
            {quote.provider.bio}
          </Text>
        </View>
      )}

      {/* Price Section */}
      <View style={styles.priceSection}>
        <View style={styles.priceHeader}>
          <Text style={styles.priceLabel}>Quote Amount</Text>
          {isLowestPrice && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Best Price</Text>
            </View>
          )}
        </View>
        <View style={styles.priceDisplay}>
          <DollarSign size={32} color={colors.primary} />
          <Text style={styles.priceAmount}>{Math.round(quote.price).toLocaleString('en-US')}</Text>
        </View>
        <View style={styles.priceFooter}>
          <Clock size={12} color={colors.textLight} />
          <Text style={styles.timeText}>
            Sent {new Date(quote.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
          onPress={onAccept}
          disabled={accepting}
        >
          <CheckCircle size={20} color={colors.white} />
          <Text style={styles.acceptButtonText}>
            {accepting ? 'Accepting...' : 'Accept Quote'}
          </Text>
        </TouchableOpacity>
        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onViewProfile}>
            <Text style={styles.secondaryButtonText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onMessage}>
            <Text style={styles.secondaryButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlighted: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  providerHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  providerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  providerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  newProviderText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
  },
  experienceText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  bioSection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  bioText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  priceSection: {
    padding: spacing.md,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  savingsBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  savingsText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  priceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  actionSection: {
    gap: spacing.sm,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
});
