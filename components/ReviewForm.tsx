import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import Button from './Button';
import { ReviewMediaUpload, MediaItem } from './ReviewMediaUpload';

interface ReviewFormProps {
  bookingId: string;
  providerId: string;
  providerName: string;
  listingId?: string;
  reviewDirection?: 'customer_to_provider' | 'provider_to_customer';
  onSubmit: (review: ReviewData) => void;
  onCancel: () => void;
}

export interface ReviewData {
  bookingId: string;
  revieweeId: string;
  listingId?: string;
  rating: number;
  title: string;
  comment: string;
  wouldRecommend: boolean;
  media?: MediaItem[];
  reviewDirection: 'customer_to_provider' | 'provider_to_customer';
}

export default function ReviewForm({
  bookingId,
  providerId,
  providerName,
  listingId,
  reviewDirection = 'customer_to_provider',
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [media, setMedia] = useState<MediaItem[]>([]);

  const isProviderReview = reviewDirection === 'provider_to_customer';

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!comment.trim()) {
      alert('Please write a review');
      return;
    }

    onSubmit({
      bookingId,
      revieweeId: providerId,
      listingId,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      wouldRecommend,
      media: media.length > 0 ? media : undefined,
      reviewDirection,
    });
  };

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return 'Rate your experience';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>
        {isProviderReview ? `Rate ${providerName} as a Job Poster` : `Review ${providerName}`}
      </Text>
      <Text style={styles.subheader}>
        {isProviderReview
          ? 'Rate your experience working with this customer'
          : 'Share your experience with this provider'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Your Rating</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Star
                size={40}
                color={star <= (hoverRating || rating) ? theme.colors.warning : theme.colors.border}
                fill={star <= (hoverRating || rating) ? theme.colors.warning : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingText}>{getRatingText(rating)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Review Title</Text>
        <TextInput
          style={styles.input}
          placeholder={isProviderReview ? 'Summarize your collaboration experience' : 'Summarize your experience'}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text style={styles.charCount}>{title.length}/100</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Your Review</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={
            isProviderReview
              ? 'Share details about communication, timeliness, requirements clarity, and overall collaboration...'
              : 'Tell others about your experience...'
          }
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.charCount}>{comment.length}/1000</Text>
      </View>

      {!isProviderReview && (
        <ReviewMediaUpload
          media={media}
          onMediaChange={setMedia}
          maxMedia={10}
        />
      )}

      <View style={styles.section}>
        <Text style={styles.label}>
          {isProviderReview
            ? 'Would you work with this customer again?'
            : 'Would you recommend this provider?'}
        </Text>
        <View style={styles.recommendContainer}>
          <TouchableOpacity
            style={[
              styles.recommendButton,
              wouldRecommend && styles.recommendButtonActive,
            ]}
            onPress={() => setWouldRecommend(true)}
          >
            <Text
              style={[
                styles.recommendText,
                wouldRecommend && styles.recommendTextActive,
              ]}
            >
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.recommendButton,
              !wouldRecommend && styles.recommendButtonActive,
            ]}
            onPress={() => setWouldRecommend(false)}
          >
            <Text
              style={[
                styles.recommendText,
                !wouldRecommend && styles.recommendTextActive,
              ]}
            >
              No
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          onPress={onCancel}
          style={styles.cancelButton}
          textStyle={styles.cancelButtonText}
        />
        <Button title="Submit Review" onPress={handleSubmit} style={styles.submitButton} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  recommendContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  recommendButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  recommendButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  recommendText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textLight,
  },
  recommendTextActive: {
    color: theme.colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
  },
  submitButton: {
    flex: 1,
  },
});
