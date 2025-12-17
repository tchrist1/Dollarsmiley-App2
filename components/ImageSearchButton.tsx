import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  takePhoto,
  pickImage,
  analyzeImage,
  searchByImage,
  formatMatchScore,
  getMatchScoreColor,
  detectProblemType,
  estimateUrgency,
  generateImageSearchSuggestions,
  type ImageSearchResult,
  type ImageSearchMatch,
} from '@/lib/image-search';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ImageSearchButtonProps {
  onResults?: (matches: ImageSearchMatch[], analysis: ImageSearchResult) => void;
  onError?: (error: string) => void;
}

export default function ImageSearchButton({
  onResults,
  onError,
}: ImageSearchButtonProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [analysis, setAnalysis] = useState<ImageSearchResult | null>(null);
  const [matches, setMatches] = useState<ImageSearchMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleOpenOptions = () => {
    setShowOptionsModal(true);
  };

  const handleTakePhoto = async () => {
    try {
      setShowOptionsModal(false);
      setError(null);

      const uri = await takePhoto();
      if (uri) {
        setImageUri(uri);
        setShowModal(true);
        await processImage(uri);
      }
    } catch (err: any) {
      setError(err.message);
      onError?.(err.message);
    }
  };

  const handlePickImage = async () => {
    try {
      setShowOptionsModal(false);
      setError(null);

      const uri = await pickImage();
      if (uri) {
        setImageUri(uri);
        setShowModal(true);
        await processImage(uri);
      }
    } catch (err: any) {
      setError(err.message);
      onError?.(err.message);
    }
  };

  const processImage = async (uri: string) => {
    setIsAnalyzing(true);
    try {
      // Analyze image
      const analysisResult = await analyzeImage(uri);
      setAnalysis(analysisResult);

      // Search for matches
      setIsSearching(true);
      const searchMatches = await searchByImage(analysisResult, user?.id);
      setMatches(searchMatches);

      // Callback with results
      onResults?.(searchMatches, analysisResult);
    } catch (err: any) {
      console.error('Error processing image:', err);
      setError(err.message);
      onError?.(err.message);
    } finally {
      setIsAnalyzing(false);
      setIsSearching(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setImageUri(null);
    setAnalysis(null);
    setMatches([]);
    setError(null);
  };

  const handleRetry = () => {
    setImageUri(null);
    setAnalysis(null);
    setMatches([]);
    setError(null);
    setShowOptionsModal(true);
  };

  const urgencyColor = analysis
    ? estimateUrgency(analysis.labels, analysis.objects || []) === 'urgent'
      ? colors.error
      : estimateUrgency(analysis.labels, analysis.objects || []) === 'high'
      ? colors.warning
      : colors.success
    : colors.textSecondary;

  return (
    <>
      {/* Image Search Button */}
      <TouchableOpacity
        style={styles.imageButton}
        onPress={handleOpenOptions}
        activeOpacity={0.7}
      >
        <Camera size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsContent}>
            <Text style={styles.optionsTitle}>Search by Image</Text>
            <Text style={styles.optionsSubtitle}>
              Take or upload a photo to find relevant service providers
            </Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleTakePhoto}
            >
              <Camera size={24} color={colors.primary} />
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Take Photo</Text>
                <Text style={styles.optionDescription}>
                  Use camera to capture the issue
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handlePickImage}
            >
              <ImageIcon size={24} color={colors.primary} />
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Choose from Library</Text>
                <Text style={styles.optionDescription}>
                  Select an existing photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Image Search Results</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Selected Image */}
            {imageUri && (
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.image} />
              </View>
            )}

            {/* Analysis Loading */}
            {isAnalyzing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Analyzing image...</Text>
              </View>
            )}

            {/* Analysis Results */}
            {analysis && !isAnalyzing && (
              <View style={styles.analysisCard}>
                <View style={styles.cardHeader}>
                  <Sparkles size={20} color={colors.primary} />
                  <Text style={styles.cardTitle}>Analysis</Text>
                </View>

                {/* Description */}
                <Text style={styles.analysisDescription}>
                  {analysis.description}
                </Text>

                {/* Problem Type */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Problem Type:</Text>
                  <Text style={styles.infoValue}>
                    {detectProblemType(analysis.labels)}
                  </Text>
                </View>

                {/* Urgency */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Urgency:</Text>
                  <View
                    style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '20' }]}
                  >
                    <Text style={[styles.urgencyText, { color: urgencyColor }]}>
                      {estimateUrgency(
                        analysis.labels,
                        analysis.objects || []
                      ).toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Detected Labels */}
                <View style={styles.labelsContainer}>
                  <Text style={styles.labelsTitle}>Detected:</Text>
                  <View style={styles.labelsList}>
                    {analysis.labels.map((label, index) => (
                      <View key={index} style={styles.labelChip}>
                        <Text style={styles.labelText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Confidence */}
                <View style={styles.confidenceBar}>
                  <Text style={styles.confidenceLabel}>
                    Confidence: {(analysis.confidence * 100).toFixed(0)}%
                  </Text>
                  <View style={styles.confidenceTrack}>
                    <View
                      style={[
                        styles.confidenceFill,
                        { width: `${analysis.confidence * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Search Loading */}
            {isSearching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Finding matches...</Text>
              </View>
            )}

            {/* Matches */}
            {matches.length > 0 && !isSearching && (
              <View style={styles.matchesSection}>
                <View style={styles.sectionHeader}>
                  <TrendingUp size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>
                    {matches.length} Matching Providers
                  </Text>
                </View>

                {matches.map((match) => (
                  <View key={match.id} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <View style={styles.matchInfo}>
                        <Text style={styles.matchName}>{match.name}</Text>
                        <Text style={styles.matchCategory}>{match.category}</Text>
                      </View>
                      <View
                        style={[
                          styles.scoreChip,
                          {
                            backgroundColor:
                              getMatchScoreColor(match.match_score) + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scoreText,
                            { color: getMatchScoreColor(match.match_score) },
                          ]}
                        >
                          {match.match_score}%
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.matchReason}>{match.match_reason}</Text>

                    <View style={styles.matchMeta}>
                      {match.rating && (
                        <Text style={styles.matchMetaText}>
                          ⭐ {match.rating.toFixed(1)}
                        </Text>
                      )}
                      {match.location && (
                        <Text style={styles.matchMetaText} numberOfLines={1}>
                          📍 {match.location}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.matchQuality}>
                      {formatMatchScore(match.match_score)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* No Matches */}
            {matches.length === 0 && !isSearching && !isAnalyzing && analysis && (
              <View style={styles.noMatchesContainer}>
                <AlertCircle size={48} color={colors.textSecondary} />
                <Text style={styles.noMatchesTitle}>No exact matches found</Text>
                <Text style={styles.noMatchesText}>
                  Try searching manually or take another photo
                </Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={24} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Camera size={20} color={colors.white} />
                <Text style={styles.retryText}>Try Another Photo</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  imageButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  optionsTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionsSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.black,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  analysisCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  analysisDescription: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  urgencyText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  labelsContainer: {
    marginTop: spacing.md,
  },
  labelsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  labelsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  labelChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.full,
  },
  labelText: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  confidenceBar: {
    marginTop: spacing.md,
  },
  confidenceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  confidenceTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  matchesSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  matchCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  matchCategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  scoreText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  matchReason: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  matchMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  matchMetaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  matchQuality: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  noMatchesContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  noMatchesTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  noMatchesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  actions: {
    marginTop: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
