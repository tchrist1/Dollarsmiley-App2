import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ReviewCard from '@/components/ReviewCard';
import RatingSummary from '@/components/RatingSummary';
import { theme } from '@/constants/theme';
import { ChevronDown } from 'lucide-react-native';

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
  reviewer: {
    full_name: string;
    avatar_url?: string;
  };
}

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

export default function ProviderReviewsScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [providerRating, setProviderRating] = useState<ProviderRating | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'helpful' | 'unhelpful'>>({});
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchProviderRating();
    if (profile) {
      fetchUserVotes();
    }
  }, [providerId, filterRating]);

  const fetchReviews = async () => {
    let query = supabase
      .from('reviews')
      .select(`
        id,
        reviewer_id,
        rating,
        title,
        comment,
        would_recommend,
        response,
        response_date,
        is_verified,
        helpful_count,
        unhelpful_count,
        created_at,
        reviewer:profiles!reviewer_id(full_name, avatar_url)
      `)
      .eq('reviewee_id', providerId)
      .eq('moderation_status', 'Approved')
      .order('created_at', { ascending: false });

    if (filterRating) {
      query = query.eq('rating', filterRating);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
    } else {
      setReviews(data as any || []);
    }
    setLoading(false);
  };

  const fetchProviderRating = async () => {
    const { data, error } = await supabase
      .from('provider_ratings')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (error) {
      console.error('Error fetching provider rating:', error);
    } else if (data) {
      setProviderRating(data);
    }
  };

  const fetchUserVotes = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('review_votes')
      .select('review_id, vote_type')
      .eq('user_id', profile.id)
      .in(
        'review_id',
        reviews.map((r) => r.id)
      );

    if (error) {
      console.error('Error fetching user votes:', error);
    } else if (data) {
      const votes: Record<string, 'helpful' | 'unhelpful'> = {};
      data.forEach((vote) => {
        votes[vote.review_id] = vote.vote_type as 'helpful' | 'unhelpful';
      });
      setUserVotes(votes);
    }
  };

  const handleVote = async (reviewId: string, voteType: 'helpful' | 'unhelpful') => {
    if (!profile) {
      alert('Please log in to vote');
      return;
    }

    const currentVote = userVotes[reviewId];

    if (currentVote === voteType) {
      const { error } = await supabase
        .from('review_votes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', profile.id);

      if (!error) {
        const newVotes = { ...userVotes };
        delete newVotes[reviewId];
        setUserVotes(newVotes);
        fetchReviews();
      }
    } else {
      const { error } = await supabase.from('review_votes').upsert(
        {
          review_id: reviewId,
          user_id: profile.id,
          vote_type: voteType,
        },
        {
          onConflict: 'review_id,user_id',
        }
      );

      if (!error) {
        setUserVotes({ ...userVotes, [reviewId]: voteType });
        fetchReviews();
      }
    }
  };

  const renderHeader = () => (
    <>
      {providerRating && <RatingSummary rating={providerRating} />}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {filterRating ? `${filterRating} Star Reviews` : 'All Reviews'}
          </Text>
          <ChevronDown size={20} color={theme.colors.text} />
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[styles.filterOption, !filterRating && styles.filterOptionActive]}
              onPress={() => {
                setFilterRating(null);
                setShowFilters(false);
              }}
            >
              <Text style={styles.filterOptionText}>All Reviews</Text>
            </TouchableOpacity>
            {[5, 4, 3, 2, 1].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.filterOption,
                  filterRating === rating && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setFilterRating(rating);
                  setShowFilters(false);
                }}
              >
                <Text style={styles.filterOptionText}>{rating} Stars</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            onVote={handleVote}
            userVote={userVotes[item.id] || null}
          />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtext}>
              {filterRating
                ? `No ${filterRating}-star reviews found`
                : 'Be the first to review this provider'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  filterOptions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  filterOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  filterOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
});
