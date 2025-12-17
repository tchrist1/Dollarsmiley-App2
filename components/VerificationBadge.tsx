import { View, Text, StyleSheet } from 'react-native';
import { Shield, CheckCircle, Award, Star, Zap, Briefcase, TrendingUp, ThumbsUp } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export interface Badge {
  slug: string;
  name: string;
  description: string;
  badge_color: string;
  badge_type: 'verification' | 'achievement' | 'status' | 'premium';
}

interface VerificationBadgeProps {
  badge: Badge;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showTooltip?: boolean;
}

export default function VerificationBadge({
  badge,
  size = 'medium',
  showLabel = false,
  showTooltip = false,
}: VerificationBadgeProps) {
  const getBadgeIcon = (slug: string) => {
    const iconSize = size === 'small' ? 12 : size === 'medium' ? 16 : 20;
    const iconColor = badge.badge_color || colors.primary;

    switch (slug) {
      case 'identity-verified':
      case 'business-verified':
      case 'background-checked':
        return <Shield size={iconSize} color={iconColor} fill={iconColor} />;
      case 'phone-verified':
      case 'email-verified':
        return <CheckCircle size={iconSize} color={iconColor} fill={iconColor} />;
      case 'top-rated':
        return <Star size={iconSize} color={iconColor} fill={iconColor} />;
      case 'elite-provider':
        return <Award size={iconSize} color={iconColor} fill={iconColor} />;
      case 'fast-responder':
        return <Zap size={iconSize} color={iconColor} fill={iconColor} />;
      case 'reliable':
        return <CheckCircle size={iconSize} color={iconColor} fill={iconColor} />;
      case 'professional':
        return <Briefcase size={iconSize} color={iconColor} fill={iconColor} />;
      case 'experienced':
        return <TrendingUp size={iconSize} color={iconColor} fill={iconColor} />;
      case 'recommended':
        return <ThumbsUp size={iconSize} color={iconColor} fill={iconColor} />;
      default:
        return <CheckCircle size={iconSize} color={iconColor} fill={iconColor} />;
    }
  };

  const sizeStyles = {
    small: styles.containerSmall,
    medium: styles.containerMedium,
    large: styles.containerLarge,
  };

  const labelStyles = {
    small: styles.labelSmall,
    medium: styles.labelMedium,
    large: styles.labelLarge,
  };

  return (
    <View style={[styles.container, sizeStyles[size], { backgroundColor: badge.badge_color + '20' }]}>
      <View style={styles.iconContainer}>{getBadgeIcon(badge.slug)}</View>
      {showLabel && (
        <Text style={[styles.label, labelStyles[size], { color: badge.badge_color }]} numberOfLines={1}>
          {badge.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  containerSmall: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  containerMedium: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xs / 2,
  },
  containerLarge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: spacing.xs / 2,
    fontWeight: fontWeight.semibold,
  },
  labelSmall: {
    fontSize: fontSize.xs,
  },
  labelMedium: {
    fontSize: fontSize.sm,
  },
  labelLarge: {
    fontSize: fontSize.md,
  },
});
