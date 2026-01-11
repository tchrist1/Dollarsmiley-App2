import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface ProviderRatingRowProps {
  label: string;
  rating: number | null;
  count: number;
  onPress?: () => void;
}

export default function ProviderRatingRow({
  label,
  rating,
  count,
  onPress,
}: ProviderRatingRowProps) {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = rating ? rating % 1 >= 0.5 : false;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            size={16}
            color={theme.colors.warning}
            fill={theme.colors.warning}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star
            key={i}
            size={16}
            color={theme.colors.warning}
            fill={theme.colors.warning}
            opacity={0.5}
          />
        );
      } else {
        stars.push(
          <Star
            key={i}
            size={16}
            color={theme.colors.border}
            fill="transparent"
          />
        );
      }
    }

    return stars;
  };

  const content = (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {rating && count > 0 ? (
        <View style={styles.ratingContent}>
          <View style={styles.starsContainer}>{renderStars()}</View>
          <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
          <Text style={styles.countText}>
            ({count} {count === 1 ? label.slice(0, -1) : label})
          </Text>
        </View>
      ) : (
        <Text style={styles.noReviewsText}>No {label} Reviews Yet</Text>
      )}
    </View>
  );

  if (onPress && rating && count > 0) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: theme.colors.textLight,
    width: 80,
    fontWeight: '500',
  },
  ratingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 8,
  },
  ratingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 4,
  },
  countText: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  noReviewsText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },
});
