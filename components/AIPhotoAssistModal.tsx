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
import { Sparkles, X, RotateCcw, Check, ImagePlus, Wand2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface AIPhotoAssistModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoGenerated: (photoUrl: string) => void;
  context?: string;
  maxPhotos?: number;
  currentPhotoCount?: number;
}

type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';

const { width: screenWidth } = Dimensions.get('window');
const imagePreviewSize = Math.min(screenWidth - spacing.lg * 4, 320);

export default function AIPhotoAssistModal({
  visible,
  onClose,
  onPhotoGenerated,
  context,
  maxPhotos = 5,
  currentPhotoCount = 0,
}: AIPhotoAssistModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<ImageSize>('1024x1024');

  const canAddMore = currentPhotoCount < maxPhotos;

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible]);

  const resetState = () => {
    setPrompt('');
    setError(null);
    setGeneratedImage(null);
    setRevisedPrompt(null);
    setLoading(false);
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
    setGeneratedImage(null);
    setRevisedPrompt(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to use AI Photo Assist.');
      }

      const response = await supabase.functions.invoke('generate-photo', {
        body: {
          prompt: prompt.trim(),
          context,
          size: selectedSize,
          quality: 'standard',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate photo');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (!response.data?.imageUrl) {
        throw new Error('No image was generated. Please try again.');
      }

      setGeneratedImage(response.data.imageUrl);
      setRevisedPrompt(response.data.revisedPrompt || null);
    } catch (err: any) {
      console.error('AI Photo generation error:', err);
      setError(err.message || 'AI Photo Assist is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (generatedImage) {
      onPhotoGenerated(generatedImage);
      onClose();
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleClose = () => {
    onClose();
  };

  const sizeOptions: { value: ImageSize; label: string }[] = [
    { value: '1024x1024', label: 'Square' },
    { value: '1792x1024', label: 'Landscape' },
    { value: '1024x1792', label: 'Portrait' },
  ];

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
              Describe what you want, and AI will generate a photo for you. You stay in control.
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

            <View style={styles.sizeContainer}>
              <Text style={styles.fieldLabel}>Photo Orientation</Text>
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

            {!loading && !generatedImage && !error && (
              <TouchableOpacity
                style={[styles.generateButton, !prompt.trim() && styles.generateButtonDisabled]}
                onPress={handleGenerate}
                disabled={!prompt.trim() || !canAddMore}
              >
                <Wand2 size={20} color={colors.white} />
                <Text style={styles.generateButtonText}>Generate Photo</Text>
              </TouchableOpacity>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Generating your photo...</Text>
                <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
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

            {generatedImage && !loading && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Generated Photo</Text>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: generatedImage }}
                    style={[styles.generatedImage, { width: imagePreviewSize, height: imagePreviewSize }]}
                    resizeMode="cover"
                  />
                </View>

                {revisedPrompt && (
                  <View style={styles.revisedPromptContainer}>
                    <Text style={styles.revisedPromptLabel}>AI interpreted your description as:</Text>
                    <Text style={styles.revisedPromptText}>{revisedPrompt}</Text>
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
                    style={styles.acceptButton}
                    onPress={handleAccept}
                  >
                    <Check size={20} color={colors.white} />
                    <Text style={styles.acceptButtonText}>Use This Photo</Text>
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
              Generated photos are created by AI and may require manual adjustments. You can always remove or replace photos after adding them.
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
    maxHeight: '90%',
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
    marginBottom: spacing.lg,
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
  sizeContainer: {
    marginBottom: spacing.lg,
  },
  sizeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sizeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  sizeOptionTextActive: {
    color: colors.white,
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
  resultLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  generatedImage: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
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
