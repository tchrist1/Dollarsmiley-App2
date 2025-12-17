import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Star, X, Clock, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ReviewPrompt,
  getMyReviewPrompts,
  dismissReviewPrompt,
  formatExpirationTime,
  getPromptUrgency,
} from '@/lib/review-prompts';
import { supabase } from '@/lib/supabase';

interface ReviewPromptBannerProps {
  onPromptDismissed?: () => void;
  compact?: boolean;
}

export function ReviewPromptBanner({
  onPromptDismissed,
  compact = false,
}: ReviewPromptBannerProps) {
  const [prompt, setPrompt] = useState<ReviewPrompt | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    loadPendingPrompt();
  }, []);

  const loadPendingPrompt = async () => {
    try {
      const prompts = await getMyReviewPrompts('Pending');

      if (prompts.length === 0) {
        const remindedPrompts = await getMyReviewPrompts('Reminded');
        if (remindedPrompts.length > 0) {
          await loadPromptDetails(remindedPrompts[0]);
        }
      } else {
        await loadPromptDetails(prompts[0]);
      }
    } catch (error) {
      console.error('Error loading review prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPromptDetails = async (promptData: ReviewPrompt) => {
    try {
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .select(
          `
          *,
          provider:profiles!bookings_provider_id_fkey(id, full_name, avatar_url)
        `
        )
        .eq('id', promptData.booking_id)
        .single();

      if (error) throw error;

      setPrompt(promptData);
      setBooking(bookingData);
    } catch (error) {
      console.error('Error loading booking details:', error);
    }
  };

  const handleReviewPress = () => {
    if (booking) {
      router.push(`/review/${booking.id}`);
    }
  };

  const handleDismiss = async () => {
    if (!prompt) return;

    Alert.alert(
      'Dismiss Review Request',
      'Are you sure you want to dismiss this review request? You can still review this booking later from your bookings list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            setDismissing(true);
            const success = await dismissReviewPrompt(prompt.id);
            if (success) {
              setPrompt(null);
              setBooking(null);
              onPromptDismissed?.();
            } else {
              Alert.alert('Error', 'Failed to dismiss review request');
            }
            setDismissing(false);
          },
        },
      ]
    );
  };

  if (loading || !prompt || !booking) {
    return null;
  }

  const urgency = getPromptUrgency(prompt);
  const expirationText = formatExpirationTime(prompt.expires_at);

  const urgencyColors = {
    low: colors.info,
    medium: colors.warning,
    high: colors.warning,
    urgent: colors.error,
  };

  const urgencyColor = urgencyColors[urgency];

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactBanner, { borderLeftColor: urgencyColor }]}
        onPress={handleReviewPress}
        activeOpacity={0.8}
      >
        <View style={[styles.compactIconContainer, { backgroundColor: urgencyColor + '20' }]}>
          <Star size={20} color={urgencyColor} fill={urgencyColor} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            Review {booking.provider.full_name}
          </Text>
          <Text style={styles.compactSubtitle} numberOfLines={1}>
            {expirationText}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.banner, { borderLeftColor: urgencyColor }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: urgencyColor + '20' }]}>
          <Star size={24} color={urgencyColor} fill={urgencyColor} />
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          disabled={dismissing}
          style={styles.dismissButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>How was your service?</Text>
        <Text style={styles.description}>
          Please share your experience with{' '}
          <Text style={styles.providerName}>{booking.provider.full_name}</Text> for your{' '}
          <Text style={styles.bookingTitle}>{booking.title}</Text>
        </Text>

        <View style={styles.footer}>
          <View style={styles.expirationContainer}>
            <Clock size={14} color={urgencyColor} />
            <Text style={[styles.expirationText, { color: urgencyColor }]}>
              {expirationText}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: urgencyColor }]}
            onPress={handleReviewPress}
            activeOpacity={0.8}
          >
            <Text style={styles.reviewButtonText}>Write Review</Text>
            <ChevronRight size={16} color={colors.white} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButton: {
    padding: spacing.xs,
  },
  content: {
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  providerName: {
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  bookingTitle: {
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expirationText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  reviewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  compactSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
