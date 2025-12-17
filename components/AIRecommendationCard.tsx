import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';
import AIAgentsService from '@/lib/ai-agents';
import { Sparkles, ThumbsUp, ThumbsDown, X } from 'lucide-react-native';

interface RecommendationCardProps {
  recommendation: {
    id: string;
    recommendation_type: string;
    recommended_item_id: string;
    recommended_item_type: string;
    reasoning: string;
    confidence_score: number;
    metadata: any;
  };
  onAccept?: () => void;
  onReject?: () => void;
}

export default function AIRecommendationCard({
  recommendation,
  onAccept,
  onReject,
}: RecommendationCardProps) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await AIAgentsService.acceptRecommendation(recommendation.id);
      onAccept?.();
    } catch (error) {
      console.error('Failed to accept recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await AIAgentsService.rejectRecommendation(recommendation.id);
      setDismissed(true);
      onReject?.();
    } catch (error) {
      console.error('Failed to reject recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = () => {
    const labels: Record<string, string> = {
      provider: 'Recommended Provider',
      service: 'Recommended Service',
      product: 'Recommended Product',
      listing: 'You Might Like',
      connection: 'Connect With',
    };

    return labels[recommendation.recommendation_type] || 'Recommendation';
  };

  const getTypeIcon = () => {
    return <Sparkles size={16} color={colors.secondary} />;
  };

  const getConfidenceColor = () => {
    if (recommendation.confidence_score >= 0.8) return colors.success;
    if (recommendation.confidence_score >= 0.6) return colors.warning;
    return colors.textSecondary;
  };

  if (dismissed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.dismissButton} onPress={handleReject}>
        <X size={16} color={colors.textLight} />
      </TouchableOpacity>

      <View style={styles.header}>
        {getTypeIcon()}
        <Text style={styles.typeLabel}>{getTypeLabel()}</Text>
        <View style={styles.confidenceBadge}>
          <Text style={[styles.confidenceText, { color: getConfidenceColor() }]}>
            {Math.round(recommendation.confidence_score * 100)}% match
          </Text>
        </View>
      </View>

      {recommendation.metadata?.image_url && (
        <Image
          source={{ uri: recommendation.metadata.image_url }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {recommendation.metadata?.title && (
        <Text style={styles.title}>{recommendation.metadata.title}</Text>
      )}

      {recommendation.reasoning && (
        <View style={styles.reasoningBox}>
          <Text style={styles.reasoningLabel}>Why we recommend this:</Text>
          <Text style={styles.reasoningText}>{recommendation.reasoning}</Text>
        </View>
      )}

      {recommendation.metadata?.price && (
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price:</Text>
          <Text style={styles.priceValue}>
            ${recommendation.metadata.price}
            {recommendation.metadata.price_unit && `/${recommendation.metadata.price_unit}`}
          </Text>
        </View>
      )}

      {recommendation.metadata?.rating && (
        <View style={styles.ratingRow}>
          <Text style={styles.ratingStars}>
            {'⭐'.repeat(Math.round(recommendation.metadata.rating))}
          </Text>
          <Text style={styles.ratingText}>
            {recommendation.metadata.rating.toFixed(1)}
            {recommendation.metadata.review_count && ` (${recommendation.metadata.review_count})`}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleReject}
          disabled={loading}
        >
          <ThumbsDown size={18} color={colors.textSecondary} />
          <Text style={styles.rejectButtonText}>Not Interested</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={handleAccept}
          disabled={loading}
        >
          <ThumbsUp size={18} color={colors.white} />
          <Text style={styles.acceptButtonText}>
            {loading ? 'Loading...' : 'View Details'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    padding: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  typeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  confidenceBadge: {
    marginLeft: 'auto',
  },
  confidenceText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  reasoningBox: {
    padding: spacing.sm,
    backgroundColor: colors.primaryLighter,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  reasoningLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  reasoningText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  ratingStars: {
    fontSize: fontSize.sm,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  rejectButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  rejectButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  acceptButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
});