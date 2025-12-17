import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ReviewCard from '@/components/ReviewCard';
import { theme } from '@/constants/theme';
import { Flag, CheckCircle, XCircle, EyeOff } from 'lucide-react-native';

interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  title: string;
  comment: string;
  would_recommend: boolean;
  response?: string;
  response_date?: string;
  is_verified: boolean;
  is_flagged: boolean;
  flag_reason?: string;
  moderation_status: string;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url?: string;
  };
  reviewee: {
    full_name: string;
  };
}

export default function AdminReviewsScreen() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged'>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (profile?.user_type !== 'Admin') {
      alert('Unauthorized access');
      return;
    }
    fetchReviews();
  }, [filter]);

  const fetchReviews = async () => {
    setLoading(true);
    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id(full_name, avatar_url),
        reviewee:profiles!reviewee_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('moderation_status', 'Pending');
    } else if (filter === 'flagged') {
      query = query.eq('is_flagged', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
    } else {
      setReviews(data as any || []);
    }
    setLoading(false);
  };

  const handleModerateReview = async (reviewId: string, status: 'Approved' | 'Rejected' | 'Hidden') => {
    if (!profile) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          moderation_status: status,
          moderated_by: profile.id,
          moderated_at: new Date().toISOString(),
          is_flagged: false,
        })
        .eq('id', reviewId);

      if (error) throw error;

      alert(`Review ${status.toLowerCase()} successfully`);
      setModalVisible(false);
      fetchReviews();
    } catch (error: any) {
      console.error('Error moderating review:', error);
      alert(error.message || 'Failed to moderate review');
    } finally {
      setActionLoading(false);
    }
  };

  const renderModerationActions = (review: Review) => (
    <View style={styles.actionsContainer}>
      <Text style={styles.actionsTitle}>Moderate Review</Text>
      <Text style={styles.reviewerInfo}>
        By: {review.reviewer.full_name} → For: {(review.reviewee as any).full_name}
      </Text>
      <Text style={styles.statusInfo}>Status: {review.moderation_status}</Text>
      {review.is_flagged && (
        <View style={styles.flaggedBanner}>
          <Flag size={16} color={theme.colors.error} />
          <Text style={styles.flaggedText}>
            Flagged: {review.flag_reason || 'No reason provided'}
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleModerateReview(review.id, 'Approved')}
          disabled={actionLoading}
        >
          <CheckCircle size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleModerateReview(review.id, 'Rejected')}
          disabled={actionLoading}
        >
          <XCircle size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.hideButton]}
          onPress={() => handleModerateReview(review.id, 'Hidden')}
          disabled={actionLoading}
        >
          <EyeOff size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Hide</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setModalVisible(false)}
        disabled={actionLoading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedReview(item);
        setModalVisible(true);
      }}
    >
      <ReviewCard review={item} />
      <View style={styles.reviewFooter}>
        <Text style={styles.statusBadge}>Status: {item.moderation_status}</Text>
        {item.is_flagged && (
          <View style={styles.flagBadge}>
            <Flag size={14} color={theme.colors.error} />
            <Text style={styles.flagBadgeText}>Flagged</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review Moderation</Text>
        <View style={styles.filterContainer}>
          {['all', 'pending', 'flagged'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f as any)}
            >
              <Text
                style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reviews to moderate</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {actionLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <>
                {selectedReview && <ReviewCard review={selectedReview} />}
                {selectedReview && renderModerationActions(selectedReview)}
              </>
            )}
          </View>
        </View>
      </Modal>
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLight,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.errorLight,
    borderRadius: 4,
  },
  flagBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.error,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  reviewerInfo: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  statusInfo: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 12,
  },
  flaggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.errorLight,
    borderRadius: 8,
    marginBottom: 16,
  },
  flaggedText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: theme.colors.success,
  },
  rejectButton: {
    backgroundColor: theme.colors.error,
  },
  hideButton: {
    backgroundColor: theme.colors.textLight,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
