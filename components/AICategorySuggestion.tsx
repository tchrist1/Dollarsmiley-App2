import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { Sparkles, Check, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SubcategoryMatch {
  subcategory_id: string;
  subcategory_name: string;
  category_id: string;
  category_name: string;
  similarity_score: number;
  matched_keywords: string[];
}

interface SuggestionResponse {
  suggested_category_id: string;
  suggested_category_name: string;
  suggested_subcategory_id: string;
  suggested_subcategory_name: string;
  confidence_score: number;
  alternate_suggestions: SubcategoryMatch[];
}

interface AICategorySuggestionProps {
  title: string;
  description: string;
  onAccept: (categoryId: string, categoryName: string, subcategoryId?: string, subcategoryName?: string) => void;
  disabled?: boolean;
  suggestionType?: 'listing' | 'job';
  visible?: boolean;
}

export default function AICategorySuggestion({
  title,
  description,
  onAccept,
  disabled,
  suggestionType = 'listing',
  visible = true,
}: AICategorySuggestionProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const handleSuggest = async () => {
    if (!title && !description) {
      setError('Please enter a title or description first');
      return;
    }

    setLoading(true);
    setError(null);
    setModalVisible(true);

    try {
      const response = await supabase.functions.invoke('suggest-listing-category', {
        body: { title, description },
      });

      if (response.error) {
        console.log('Edge function error:', response.error);
        setError('AI suggestions are temporarily unavailable. Please select a category manually from the dropdown below.');
        setSuggestion(null);
      } else if (!response.data) {
        setError('AI suggestions are temporarily unavailable. Please select a category manually from the dropdown below.');
        setSuggestion(null);
      } else if (response.data.error) {
        console.log('Response data error:', response.data.error);
        setError('AI suggestions are temporarily unavailable. Please select a category manually from the dropdown below.');
        setSuggestion(null);
      } else {
        setSuggestion(response.data);

        if (profile?.id && response.data.suggested_category_id) {
          supabase
            .from('ai_category_suggestion_tracking')
            .insert({
              user_id: profile.id,
              suggestion_type: suggestionType,
              input_title: title,
              input_description: description,
              suggested_category_id: response.data.suggested_category_id,
              suggested_subcategory_id: response.data.suggested_subcategory_id,
              confidence_score: response.data.confidence_score,
              accepted: false,
            })
            .select('id')
            .single()
            .then(({ data: trackingData }) => {
              if (trackingData) {
                setTrackingId(trackingData.id);
              }
            });
        }
      }
    } catch (err: any) {
      console.error('AI suggestion error:', err);
      setError('Failed to get AI suggestion. Please try again.');
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (categoryId: string, categoryName: string, subcategoryId?: string, subcategoryName?: string) => {
    if (trackingId) {
      supabase
        .from('ai_category_suggestion_tracking')
        .update({
          accepted: true,
          actual_category_id: categoryId,
          actual_subcategory_id: subcategoryId || null,
        })
        .eq('id', trackingId)
        .then(() => {});
    }

    onAccept(categoryId, categoryName, subcategoryId, subcategoryName);
    setModalVisible(false);
    setSuggestion(null);
    setTrackingId(null);
  };

  const handleClose = () => {
    setModalVisible(false);
    setSuggestion(null);
    setError(null);
  };

  const getConfidenceColor = (score: number): string => {
    if (score >= 0.7) return colors.success;
    if (score >= 0.4) return colors.warning;
    return colors.error;
  };

  const getConfidenceLabel = (score: number): string => {
    if (score >= 0.7) return 'High Confidence';
    if (score >= 0.4) return 'Medium Confidence';
    return 'Low Confidence';
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.suggestButton, disabled && styles.suggestButtonDisabled]}
        onPress={handleSuggest}
        disabled={disabled || loading}
      >
        <Sparkles size={20} color={disabled ? colors.textSecondary : colors.primary} />
        <Text style={[styles.suggestButtonText, disabled && styles.suggestButtonTextDisabled]}>
          AI Suggest Category
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Sparkles size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>AI Category Suggestion</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Analyzing your description...</Text>
                </View>
              )}

              {error && !loading && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={handleSuggest}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {suggestion && !loading && (
                <>
                  <View style={styles.suggestionCard}>
                    <View style={styles.confidenceHeader}>
                      <View
                        style={[
                          styles.confidenceBadge,
                          { backgroundColor: getConfidenceColor(suggestion.confidence_score) },
                        ]}
                      >
                        <Text style={styles.confidenceBadgeText}>
                          {getConfidenceLabel(suggestion.confidence_score)}
                        </Text>
                      </View>
                      <Text style={styles.confidenceScore}>
                        {(suggestion.confidence_score * 100).toFixed(0)}% match
                      </Text>
                    </View>

                    <View style={styles.suggestionDetails}>
                      <Text style={styles.suggestionLabel}>Suggested Category</Text>
                      <Text style={styles.suggestionValue}>
                        {suggestion.suggested_category_name}
                      </Text>

                      <Text style={styles.suggestionLabel}>Subcategory</Text>
                      <Text style={styles.suggestionValue}>
                        {suggestion.suggested_subcategory_name}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() =>
                        handleAcceptSuggestion(
                          suggestion.suggested_category_id,
                          suggestion.suggested_category_name,
                          suggestion.suggested_subcategory_id,
                          suggestion.suggested_subcategory_name
                        )
                      }
                    >
                      <Check size={20} color={colors.white} />
                      <Text style={styles.acceptButtonText}>Accept This Category</Text>
                    </TouchableOpacity>
                  </View>

                  {suggestion.alternate_suggestions &&
                    suggestion.alternate_suggestions.length > 0 && (
                      <>
                        <Text style={styles.alternatesHeader}>Other Possible Matches</Text>
                        {suggestion.alternate_suggestions.map((alt, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.alternateCard}
                            onPress={() =>
                              handleAcceptSuggestion(alt.category_id, alt.category_name, alt.subcategory_id, alt.subcategory_name)
                            }
                          >
                            <View style={styles.alternateInfo}>
                              <Text style={styles.alternateCategory}>{alt.category_name}</Text>
                              <Text style={styles.alternateSubcategory}>
                                {alt.subcategory_name}
                              </Text>
                            </View>
                            <Text style={styles.alternateScore}>
                              {((alt.similarity_score / 10) * 100).toFixed(0)}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  suggestButtonDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  suggestButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  suggestButtonTextDisabled: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  suggestionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  confidenceBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  confidenceBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  confidenceScore: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  suggestionDetails: {
    marginBottom: spacing.md,
  },
  suggestionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  suggestionValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  acceptButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  alternatesHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  alternateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  alternateInfo: {
    flex: 1,
  },
  alternateCategory: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  alternateSubcategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  alternateScore: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
