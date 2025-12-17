import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface ProviderRating {
  total_reviews: number;
  average_rating: number;
  rating_5_count: number;
  rating_4_count: number;
  rating_3_count: number;
  rating_2_count: number;
  rating_1_count: number;
  recommend_percentage: number;
  response_rate: number;
}

interface RatingSummaryProps {
  rating: ProviderRating;
}

export default function RatingSummary({ rating }: RatingSummaryProps) {
  const getRatingBarWidth = (count: number) => {
    if (rating.total_reviews === 0) return 0;
    return (count / rating.total_reviews) * 100;
  };

  const ratingBreakdown = [
    { stars: 5, count: rating.rating_5_count },
    { stars: 4, count: rating.rating_4_count },
    { stars: 3, count: rating.rating_3_count },
    { stars: 2, count: rating.rating_2_count },
    { stars: 1, count: rating.rating_1_count },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.overallContainer}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreNumber}>{rating.average_rating.toFixed(1)}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={20}
                color={
                  star <= Math.round(rating.average_rating)
                    ? theme.colors.warning
                    : theme.colors.border
                }
                fill={
                  star <= Math.round(rating.average_rating)
                    ? theme.colors.warning
                    : 'transparent'
                }
              />
            ))}
          </View>
          <Text style={styles.totalReviews}>
            {rating.total_reviews} {rating.total_reviews === 1 ? 'review' : 'reviews'}
          </Text>
        </View>

        <View style={styles.breakdownContainer}>
          {ratingBreakdown.map((item) => (
            <View key={item.stars} style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>{item.stars} ★</Text>
              <View style={styles.barContainer}>
                <View
                  style={[styles.barFill, { width: `${getRatingBarWidth(item.count)}%` }]}
                />
              </View>
              <Text style={styles.ratingCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rating.recommend_percentage.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>Would recommend</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rating.response_rate.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>Response rate</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    marginRight: 24,
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  breakdownContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    width: 40,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.warning,
  },
  ratingCount: {
    width: 30,
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
});
