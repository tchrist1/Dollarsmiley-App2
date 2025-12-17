import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ReviewForm, { ReviewData } from '@/components/ReviewForm';
import { theme } from '@/constants/theme';

interface Booking {
  id: string;
  provider_id: string;
  listing_id?: string;
  title: string;
  status: string;
  can_review: boolean;
  review_submitted: boolean;
  provider: {
    full_name: string;
  };
}

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    if (!profile || !bookingId) return;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        provider_id,
        listing_id,
        title,
        status,
        can_review,
        review_submitted,
        provider:profiles!provider_id(full_name)
      `)
      .eq('id', bookingId)
      .eq('customer_id', profile.id)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      alert('Failed to load booking details');
      router.back();
      return;
    }

    if (!data.can_review || data.review_submitted) {
      alert('This booking cannot be reviewed');
      router.back();
      return;
    }

    setBooking(data as any);
    setLoading(false);
  };

  const handleSubmit = async (reviewData: ReviewData) => {
    if (!profile || !booking) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        booking_id: reviewData.bookingId,
        reviewer_id: profile.id,
        reviewee_id: reviewData.revieweeId,
        listing_id: reviewData.listingId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        would_recommend: reviewData.wouldRecommend,
        is_verified: true,
        moderation_status: 'Approved',
      });

      if (error) throw error;

      const notificationUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`;

      await fetch(notificationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: booking.provider_id,
          type: 'ReviewReceived',
          title: 'New Review Received',
          body: `You received a ${reviewData.rating}-star review: "${reviewData.title}"`,
          data: {
            bookingId: booking.id,
            rating: reviewData.rating,
          },
          actionUrl: `/profile`,
          priority: 'normal',
        }),
      });

      alert('Review submitted successfully!');
      router.back();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      alert(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {submitting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.overlayText}>Submitting review...</Text>
        </View>
      )}
      <ReviewForm
        bookingId={booking.id}
        providerId={booking.provider_id}
        providerName={(booking.provider as any).full_name}
        listingId={booking.listing_id}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});
