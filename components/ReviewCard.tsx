import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  title: string;
  comment: string;
  would_recommend: boolean;
  response?: string;
  response_date?: string;
  is_verified: boolean;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
  reviewer?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ReviewCardProps {
  review: Review;
  onVote?: (reviewId: string, voteType: 'helpful' | 'unhelpful') => void;
  userVote?: 'helpful' | 'unhelpful' | null;
}

export default function ReviewCard({ review, onVote, userVote }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {review.reviewer?.avatar_url ? (
            <Image source={{ uri: review.reviewer.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {getInitials(review.reviewer?.full_name || 'Anonymous')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.reviewerName}>
              {review.reviewer?.full_name || 'Anonymous'}
            </Text>
            {review.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.date}>{formatDate(review.created_at)}</Text>
        </View>
      </View>

      <View style={styles.ratingContainer}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
              color={star <= review.rating ? theme.colors.warning : theme.colors.border}
              fill={star <= review.rating ? theme.colors.warning : 'transparent'}
            />
          ))}
        </View>
        {review.would_recommend && (
          <Text style={styles.recommend}>Would recommend</Text>
        )}
      </View>

      <Text style={styles.title}>{review.title}</Text>
      <Text style={styles.comment}>{review.comment}</Text>

      {review.response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseHeader}>Provider Response</Text>
          <Text style={styles.responseText}>{review.response}</Text>
          {review.response_date && (
            <Text style={styles.responseDate}>{formatDate(review.response_date)}</Text>
          )}
        </View>
      )}

      {onVote && (
        <View style={styles.votingContainer}>
          <Text style={styles.votingLabel}>Was this helpful?</Text>
          <View style={styles.votingButtons}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                userVote === 'helpful' && styles.voteButtonActive,
              ]}
              onPress={() => onVote(review.id, 'helpful')}
            >
              <ThumbsUp
                size={16}
                color={
                  userVote === 'helpful' ? theme.colors.primary : theme.colors.textLight
                }
              />
              <Text
                style={[
                  styles.voteText,
                  userVote === 'helpful' && styles.voteTextActive,
                ]}
              >
                Yes ({review.helpful_count})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.voteButton,
                userVote === 'unhelpful' && styles.voteButtonActive,
              ]}
              onPress={() => onVote(review.id, 'unhelpful')}
            >
              <ThumbsDown
                size={16}
                color={
                  userVote === 'unhelpful' ? theme.colors.primary : theme.colors.textLight
                }
              />
              <Text
                style={[
                  styles.voteText,
                  userVote === 'unhelpful' && styles.voteTextActive,
                ]}
              >
                No ({review.unhelpful_count})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: theme.colors.successLight,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.success,
  },
  date: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  recommend: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  comment: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  responseContainer: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  responseHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  responseText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  responseDate: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  votingLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  votingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  voteButtonActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  voteText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  voteTextActive: {
    color: theme.colors.primary,
  },
});
