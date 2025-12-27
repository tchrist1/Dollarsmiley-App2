import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { Sparkles, X, RotateCcw, Check, Wand2, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface SourceContext {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  locationType?: string;
  fulfillmentType?: string[];
  listingType?: 'Service' | 'CustomService';
  jobType?: 'quote_based' | 'fixed_price';
}

interface AIPhotoAssistModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoGenerated: (photoUrl: string) => void;
  onMultiplePhotosGenerated?: (photoUrls: string[]) => void;
  sourceContext?: SourceContext;
  maxPhotos?: number;
  currentPhotoCount?: number;
}

type ImageSize = '1024x1024' | '1536x1024' | '1024x1536';

interface GeneratedImage {
  imageUrl: string;
  revisedPrompt: string;
}

const { width: screenWidth } = Dimensions.get('window');
const imagePreviewSize = Math.min(screenWidth - spacing.lg * 4, 320);

function generateVisualSummary(context: SourceContext): string {
  if (!context.description || context.description.trim().length === 0) {
    return '';
  }

  const desc = context.description.toLowerCase();
  let summary = '';

  if (context.listingType === 'CustomService' || context.fulfillmentType?.includes('Shipping')) {
    summary = 'Professional product photo showcasing';
  } else if (context.jobType) {
    if (desc.includes('clean') || desc.includes('tidy')) {
      summary = 'Bright, clean space with professional finish';
    } else if (desc.includes('repair') || desc.includes('fix')) {
      summary = 'Professional repair work in progress, clear before/after view';
    } else if (desc.includes('paint') || desc.includes('wall')) {
      summary = 'Freshly painted interior with even coverage';
    } else if (desc.includes('landscape') || desc.includes('garden') || desc.includes('yard')) {
      summary = 'Well-maintained outdoor space with natural lighting';
    } else if (desc.includes('move') || desc.includes('furniture')) {
      summary = 'Professional movers handling furniture carefully';
    } else if (desc.includes('install') || desc.includes('setup')) {
      summary = 'Professional installation in modern space';
    } else {
      summary = 'Professional service work in progress';
    }
  } else {
    if (desc.includes('clean')) {
      summary = 'Spotless, professionally cleaned space with natural lighting';
    } else if (desc.includes('photo') || desc.includes('video')) {
      summary = 'Professional photography setup with modern equipment';
    } else if (desc.includes('food') || desc.includes('catering')) {
      summary = 'Beautifully presented dishes in professional setting';
    } else if (desc.includes('beauty') || desc.includes('makeup') || desc.includes('hair')) {
      summary = 'Professional beauty service in modern salon setting';
    } else if (desc.includes('tutor') || desc.includes('teach')) {
      summary = 'Engaging learning environment with modern materials';
    } else if (desc.includes('fitness') || desc.includes('training')) {
      summary = 'Dynamic fitness training in professional gym setting';
    } else if (desc.includes('event') || desc.includes('party')) {
      summary = 'Elegant event setup with professional decor';
    } else if (desc.includes('music') || desc.includes('dj')) {
      summary = 'Professional music setup with modern equipment';
    } else if (desc.includes('massage') || desc.includes('spa')) {
      summary = 'Serene spa environment with professional ambiance';
    } else {
      summary = 'Professional service environment with clear detail';
    }
  }

  if (context.category && summary) {
    summary += `, ${context.category.toLowerCase()} context`;
  }

  return summary;
}

export default function AIPhotoAssistModal({
  visible,
  onClose,
  onPhotoGenerated,
  onMultiplePhotosGenerated,
  sourceContext,
  maxPhotos = 5,
  currentPhotoCount = 0,
}: AIPhotoAssistModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ImageSize>('1024x1024');
  const [photoCount, setPhotoCount] = useState(1);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [hasPrefilledOnce, setHasPrefilledOnce] = useState(false);

  const remainingSlots = maxPhotos - currentPhotoCount;
  const canAddMore = remainingSlots > 0;
  const maxGeneratable = Math.min(5, remainingSlots);

  useEffect(() => {
    if (!visible) {
      resetState();
      setHasPrefilledOnce(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !hasPrefilledOnce && sourceContext) {
      const visualSummary = generateVisualSummary(sourceContext);
      if (visualSummary && prompt.trim() === '') {
        setPrompt(visualSummary);
        setHasPrefilledOnce(true);
      }
    }
  }, [visible, sourceContext, hasPrefilledOnce, prompt]);

  useEffect(() => {
    if (photoCount > maxGeneratable) {
      setPhotoCount(Math.max(1, maxGeneratable));
    }
  }, [maxGeneratable]);

  const resetState = () => {
    setPrompt('');
    setError(null);
    setGeneratedImages([]);
    setSelectedImageIndex(0);
    setSelectedPhotos(new Set());
    setLoading(false);
    setPhotoCount(1);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please describe the photo you want to generate.');
      return;
    }

    if (!canAddMore) {
      setError(`You've reached the maximum of ${maxPhotos} photos.`);
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedImageIndex(0);
    setSelectedPhotos(new Set());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to use AI Photo Assist.');
      }

      const response = await supabase.functions.invoke('generate-photo', {
        body: {
          prompt: prompt.trim(),
          sourceContext,
          size: selectedSize,
          count: photoCount,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate photo');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (response.data?.images && response.data.images.length > 0) {
        setGeneratedImages(response.data.images);
        setSelectedPhotos(new Set([0]));
      } else if (response.data?.imageUrl) {
        setGeneratedImages([{
          imageUrl: response.data.imageUrl,
          revisedPrompt: response.data.revisedPrompt || prompt,
        }]);
        setSelectedPhotos(new Set([0]));
      } else {
        throw new Error('No images were generated. Please try again.');
      }
    } catch (err: any) {
      console.error('AI Photo generation error:', err);
      setError(err.message || 'AI Photo Assist is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (generatedImages.length === 0) return;

    const selectedUrls = Array.from(selectedPhotos)
      .sort((a, b) => a - b)
      .map(index => generatedImages[index]?.imageUrl)
      .filter(Boolean) as string[];

    if (selectedUrls.length === 0) return;

    if (selectedUrls.length === 1) {
      onPhotoGenerated(selectedUrls[0]);
    } else if (onMultiplePhotosGenerated) {
      onMultiplePhotosGenerated(selectedUrls);
    } else {
      selectedUrls.forEach(url => onPhotoGenerated(url));
    }
    onClose();
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleClose = () => {
    onClose();
  };

  const togglePhotoSelection = (index: number) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      if (newSelected.size < remainingSlots) {
        newSelected.add(index);
      }
    }
    setSelectedPhotos(newSelected);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    } else if (direction === 'next' && selectedImageIndex < generatedImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const sizeOptions: { value: ImageSize; label: string }[] = [
    { value: '1024x1024', label: 'Square' },
    { value: '1536x1024', label: 'Landscape' },
    { value: '1024x1536', label: 'Portrait' },
  ];

  const currentImage = generatedImages[selectedImageIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Sparkles size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>AI Photo Assist</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.helperIntro}>
              Describe what you want, and AI will generate photos for you.
            </Text>

            <View style={styles.promptContainer}>
              <Text style={styles.fieldLabel}>Photo Description</Text>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="e.g., A clean, modern living room with natural lighting..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text style={styles.charCount}>{prompt.length}/500</Text>
            </View>

            <View style={styles.optionsRow}>
              <View style={styles.sizeContainer}>
                <Text style={styles.fieldLabel}>Orientation</Text>
                <View style={styles.sizeOptions}>
                  {sizeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sizeOption,
                        selectedSize === option.value && styles.sizeOptionActive,
                      ]}
                      onPress={() => setSelectedSize(option.value)}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.sizeOptionText,
                        selectedSize === option.value && styles.sizeOptionTextActive,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {maxGeneratable > 1 && (
                <View style={styles.countContainer}>
                  <Text style={styles.fieldLabel}>Photos to Generate</Text>
                  <View style={styles.countSelector}>
                    <TouchableOpacity
                      style={[styles.countButton, photoCount <= 1 && styles.countButtonDisabled]}
                      onPress={() => setPhotoCount(Math.max(1, photoCount - 1))}
                      disabled={loading || photoCount <= 1}
                    >
                      <Text style={styles.countButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.countValue}>{photoCount}</Text>
                    <TouchableOpacity
                      style={[styles.countButton, photoCount >= maxGeneratable && styles.countButtonDisabled]}
                      onPress={() => setPhotoCount(Math.min(maxGeneratable, photoCount + 1))}
                      disabled={loading || photoCount >= maxGeneratable}
                    >
                      <Text style={styles.countButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {!loading && generatedImages.length === 0 && !error && (
              <TouchableOpacity
                style={[styles.generateButton, !prompt.trim() && styles.generateButtonDisabled]}
                onPress={handleGenerate}
                disabled={!prompt.trim() || !canAddMore}
              >
                <Wand2 size={20} color={colors.white} />
                <Text style={styles.generateButtonText}>
                  Generate {photoCount > 1 ? `${photoCount} Photos` : 'Photo'}
                </Text>
              </TouchableOpacity>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Generating your photos...</Text>
                <Text style={styles.loadingSubtext}>This may take a moment</Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleGenerate}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {generatedImages.length > 0 && !loading && (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultLabel}>
                    Generated {generatedImages.length === 1 ? 'Photo' : 'Photos'}
                  </Text>
                  {generatedImages.length > 1 && (
                    <Text style={styles.selectionCount}>
                      {selectedPhotos.size} selected
                    </Text>
                  )}
                </View>

                <View style={styles.imageContainer}>
                  {generatedImages.length > 1 && (
                    <TouchableOpacity
                      style={[styles.navButton, styles.navButtonLeft, selectedImageIndex === 0 && styles.navButtonDisabled]}
                      onPress={() => navigateImage('prev')}
                      disabled={selectedImageIndex === 0}
                    >
                      <ChevronLeft size={24} color={selectedImageIndex === 0 ? colors.textLight : colors.text} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.imageWrapper,
                      selectedPhotos.has(selectedImageIndex) && styles.imageWrapperSelected,
                    ]}
                    onPress={() => togglePhotoSelection(selectedImageIndex)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: currentImage?.imageUrl }}
                      style={[styles.generatedImage, { width: imagePreviewSize, height: imagePreviewSize }]}
                      resizeMode="cover"
                    />
                    {selectedPhotos.has(selectedImageIndex) && (
                      <View style={styles.selectedBadge}>
                        <Check size={16} color={colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {generatedImages.length > 1 && (
                    <TouchableOpacity
                      style={[styles.navButton, styles.navButtonRight, selectedImageIndex === generatedImages.length - 1 && styles.navButtonDisabled]}
                      onPress={() => navigateImage('next')}
                      disabled={selectedImageIndex === generatedImages.length - 1}
                    >
                      <ChevronRight size={24} color={selectedImageIndex === generatedImages.length - 1 ? colors.textLight : colors.text} />
                    </TouchableOpacity>
                  )}
                </View>

                {generatedImages.length > 1 && (
                  <View style={styles.thumbnailRow}>
                    {generatedImages.map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.thumbnail,
                          index === selectedImageIndex && styles.thumbnailActive,
                          selectedPhotos.has(index) && styles.thumbnailSelected,
                        ]}
                        onPress={() => setSelectedImageIndex(index)}
                      >
                        <Image
                          source={{ uri: img.imageUrl }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                        {selectedPhotos.has(index) && (
                          <View style={styles.thumbnailCheck}>
                            <Check size={10} color={colors.white} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {generatedImages.length > 1 && (
                  <Text style={styles.selectionHint}>
                    Tap photos to select. You can add up to {remainingSlots} more.
                  </Text>
                )}

                {currentImage?.revisedPrompt && (
                  <View style={styles.revisedPromptContainer}>
                    <Text style={styles.revisedPromptLabel}>AI interpretation:</Text>
                    <Text style={styles.revisedPromptText}>{currentImage.revisedPrompt}</Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={handleRegenerate}
                  >
                    <RotateCcw size={18} color={colors.primary} />
                    <Text style={styles.regenerateButtonText}>Regenerate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.acceptButton, selectedPhotos.size === 0 && styles.acceptButtonDisabled]}
                    onPress={handleAccept}
                    disabled={selectedPhotos.size === 0}
                  >
                    <Plus size={20} color={colors.white} />
                    <Text style={styles.acceptButtonText}>
                      Add {selectedPhotos.size === 1 ? 'Photo' : `${selectedPhotos.size} Photos`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!canAddMore && (
              <View style={styles.limitReachedContainer}>
                <Text style={styles.limitReachedText}>
                  You've reached the maximum of {maxPhotos} photos.
                </Text>
              </View>
            )}

            <Text style={styles.footerNote}>
              AI-generated photos. You can remove or replace photos after adding them.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
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
  helperIntro: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  promptContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  promptInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sizeContainer: {
    flex: 1,
  },
  sizeOptions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sizeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  sizeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  sizeOptionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  sizeOptionTextActive: {
    color: colors.white,
  },
  countContainer: {
    minWidth: 100,
  },
  countSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButtonDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  countButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  countValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  generateButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  loadingSubtext: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.errorLight || '#FEE2E2',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
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
  resultContainer: {
    marginBottom: spacing.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  selectionCount: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  navButtonLeft: {
    marginRight: spacing.xs,
  },
  navButtonRight: {
    marginLeft: spacing.xs,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  imageWrapper: {
    borderRadius: borderRadius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  imageWrapperSelected: {
    borderColor: colors.success,
  },
  generatedImage: {
    borderRadius: borderRadius.md - 2,
    backgroundColor: colors.surface,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailSelected: {
    borderColor: colors.success,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  revisedPromptContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  revisedPromptLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  revisedPromptText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  regenerateButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  acceptButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  acceptButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  limitReachedContainer: {
    backgroundColor: colors.warningLight || '#FEF3C7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  limitReachedText: {
    fontSize: fontSize.sm,
    color: colors.warning || '#D97706',
    textAlign: 'center',
  },
  footerNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
