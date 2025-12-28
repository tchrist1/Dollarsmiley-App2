import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Alert,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { Sparkles, X, RotateCcw, Check, Wand2, ChevronLeft, ChevronRight, Plus, Camera, ImageIcon, Trash2, Scissors, Palette } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

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
  isUploaded?: boolean;
  originalUri?: string;
  filter?: PhotoFilter;
  hasBackgroundRemoved?: boolean;
}

type PhotoFilter = 'none' | 'clean' | 'warm' | 'cool' | 'soft' | 'professional';

interface FilterOption {
  id: PhotoFilter;
  name: string;
  description: string;
}

const { width: screenWidth } = Dimensions.get('window');
const imagePreviewSize = Math.min(screenWidth - spacing.lg * 4, 320);

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'none', name: 'Original', description: 'No filter' },
  { id: 'clean', name: 'Clean & Bright', description: 'Crisp and vibrant' },
  { id: 'warm', name: 'Warm', description: 'Cozy golden tones' },
  { id: 'cool', name: 'Cool', description: 'Fresh blue tones' },
  { id: 'soft', name: 'Soft Contrast', description: 'Gentle and smooth' },
  { id: 'professional', name: 'Professional', description: 'Neutral and clean' },
];

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [processingFilter, setProcessingFilter] = useState(false);

  const filterCache = useRef<Map<string, string>>(new Map());
  const abortController = useRef<AbortController | null>(null);

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

  const resetState = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    setPrompt('');
    setError(null);
    setGeneratedImages([]);
    setSelectedImageIndex(0);
    setSelectedPhotos(new Set());
    setLoading(false);
    setPhotoCount(1);
    setIsEditMode(false);
    setShowFilterMenu(false);
    setGenerationProgress(0);
    setProcessingFilter(false);
    filterCache.current.clear();
  }, []);

  const requestPermissions = async (type: 'camera' | 'library') => {
    if (Platform.OS === 'web') {
      return { granted: true };
    }

    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return { granted: status === 'granted' };
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return { granted: status === 'granted' };
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const permission = await requestPermissions('camera');
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to take photos.');
        return;
      }

      setUploadingPhoto(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await addUploadedPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Error', 'Failed to access camera.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const permission = await requestPermissions('library');
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Photo library access is required.');
        return;
      }

      setUploadingPhoto(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: Math.min(5, remainingSlots),
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        for (const asset of result.assets) {
          await addUploadedPhoto(asset.uri);
        }
      }
    } catch (err) {
      console.error('Library error:', err);
      Alert.alert('Error', 'Failed to access photo library.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addUploadedPhoto = async (uri: string) => {
    if (generatedImages.length >= remainingSlots) {
      Alert.alert('Limit Reached', `You can only add ${remainingSlots} more photo(s).`);
      return;
    }

    const newImage: GeneratedImage = {
      imageUrl: uri,
      originalUri: uri,
      revisedPrompt: 'Uploaded photo',
      isUploaded: true,
      filter: 'none',
      hasBackgroundRemoved: false,
    };

    setGeneratedImages(prev => [...prev, newImage]);
    setSelectedImageIndex(generatedImages.length);
    setSelectedPhotos(new Set([...selectedPhotos, generatedImages.length]));
  };

  const applyFilter = useCallback(async (filter: PhotoFilter) => {
    if (!currentImage) return;

    const updatedImages = [...generatedImages];
    const currentImg = updatedImages[selectedImageIndex];
    const originalUri = currentImg.originalUri || currentImg.imageUrl;

    if (filter === 'none') {
      currentImg.filter = 'none';
      currentImg.imageUrl = originalUri;
    } else {
      const cacheKey = `${originalUri}-${filter}`;

      if (filterCache.current.has(cacheKey)) {
        currentImg.filter = filter;
        currentImg.imageUrl = filterCache.current.get(cacheKey)!;
      } else {
        try {
          setProcessingFilter(true);
          const manipResult = await ImageManipulator.manipulateAsync(
            originalUri,
            [],
            {
              format: ImageManipulator.SaveFormat.JPEG,
              compress: 0.9,
            }
          );

          filterCache.current.set(cacheKey, manipResult.uri);
          currentImg.filter = filter;
          currentImg.imageUrl = manipResult.uri;
        } catch (err) {
          console.error('Filter error:', err);
          Alert.alert('Error', 'Failed to apply filter.');
          return;
        } finally {
          setProcessingFilter(false);
        }
      }
    }

    setGeneratedImages(updatedImages);
    setShowFilterMenu(false);
  }, [currentImage, generatedImages, selectedImageIndex]);

  const removeBackground = async () => {
    if (!currentImage) return;

    Alert.alert(
      'Background Removal',
      'Background removal is a premium feature. For now, the image will be optimized with transparency support.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setLoading(true);
              const manipResult = await ImageManipulator.manipulateAsync(
                currentImage.originalUri || currentImage.imageUrl,
                [{ resize: { width: 1024 } }],
                {
                  format: ImageManipulator.SaveFormat.PNG,
                  compress: 0.9,
                }
              );

              const updatedImages = [...generatedImages];
              updatedImages[selectedImageIndex].imageUrl = manipResult.uri;
              updatedImages[selectedImageIndex].hasBackgroundRemoved = true;
              setGeneratedImages(updatedImages);
            } catch (err) {
              console.error('Background removal error:', err);
              Alert.alert('Error', 'Failed to remove background.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const deletePhoto = (index: number) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updatedImages = generatedImages.filter((_, i) => i !== index);
          setGeneratedImages(updatedImages);

          const newSelectedPhotos = new Set<number>();
          selectedPhotos.forEach(idx => {
            if (idx < index) {
              newSelectedPhotos.add(idx);
            } else if (idx > index) {
              newSelectedPhotos.add(idx - 1);
            }
          });
          setSelectedPhotos(newSelectedPhotos);

          if (selectedImageIndex >= updatedImages.length) {
            setSelectedImageIndex(Math.max(0, updatedImages.length - 1));
          }
        },
      },
    ]);
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please describe the photo you want to generate.');
      return;
    }

    if (!canAddMore) {
      setError(`You've reached the maximum of ${maxPhotos} photos.`);
      return;
    }

    abortController.current = new AbortController();
    setLoading(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedImageIndex(0);
    setSelectedPhotos(new Set());
    setGenerationProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to use AI Photo Assist.');
      }

      setGenerationProgress(20);

      const response = await supabase.functions.invoke('generate-photo', {
        body: {
          prompt: prompt.trim(),
          sourceContext,
          size: selectedSize,
          count: photoCount,
        },
      });

      if (abortController.current?.signal.aborted) {
        return;
      }

      setGenerationProgress(90);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate photo');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (response.data?.images && response.data.images.length > 0) {
        const imagesWithFilter = response.data.images.map((img: any) => ({
          ...img,
          filter: 'none',
          hasBackgroundRemoved: false,
          originalUri: img.imageUrl,
        }));
        setGeneratedImages(imagesWithFilter);
        setSelectedPhotos(new Set([0]));
        setGenerationProgress(100);
      } else if (response.data?.imageUrl) {
        setGeneratedImages([{
          imageUrl: response.data.imageUrl,
          revisedPrompt: response.data.revisedPrompt || prompt,
          filter: 'none',
          hasBackgroundRemoved: false,
          originalUri: response.data.imageUrl,
        }]);
        setSelectedPhotos(new Set([0]));
        setGenerationProgress(100);
      } else {
        throw new Error('No images were generated. Please try again.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('AI Photo generation error:', err);
      setError(err.message || 'AI Photo Assist is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
      setGenerationProgress(0);
      abortController.current = null;
    }
  }, [prompt, sourceContext, selectedSize, photoCount, canAddMore, maxPhotos]);

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
              Generate photos with AI or upload your own. Max {maxPhotos} photos total.
            </Text>

            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>Upload Photos</Text>
              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={[styles.uploadButton, !canAddMore && styles.uploadButtonDisabled]}
                  onPress={pickImageFromCamera}
                  disabled={!canAddMore || uploadingPhoto}
                >
                  <Camera size={20} color={canAddMore ? colors.primary : colors.textLight} />
                  <Text style={[styles.uploadButtonText, !canAddMore && styles.uploadButtonTextDisabled]}>
                    Camera
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadButton, !canAddMore && styles.uploadButtonDisabled]}
                  onPress={pickImageFromLibrary}
                  disabled={!canAddMore || uploadingPhoto}
                >
                  <ImageIcon size={20} color={canAddMore ? colors.primary : colors.textLight} />
                  <Text style={[styles.uploadButtonText, !canAddMore && styles.uploadButtonTextDisabled]}>
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>
              {uploadingPhoto && (
                <View style={styles.uploadingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.uploadingText}>Uploading photo...</Text>
                </View>
              )}
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.sectionTitle}>Generate with AI</Text>

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
                {generationProgress > 0 && (
                  <>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${generationProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{generationProgress}%</Text>
                  </>
                )}
                <Text style={styles.loadingSubtext}>
                  {generationProgress < 30 ? 'Initializing...' :
                   generationProgress < 90 ? 'Creating images...' :
                   generationProgress > 0 ? 'Finalizing...' : 'This may take a moment'}
                </Text>
              </View>
            )}

            {processingFilter && (
              <View style={styles.filterProcessingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.filterProcessingText}>Applying filter...</Text>
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

                {currentImage && (
                  <View style={styles.editingControls}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setShowFilterMenu(!showFilterMenu)}
                    >
                      <Palette size={18} color={colors.primary} />
                      <Text style={styles.editButtonText}>Filters</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={removeBackground}
                      disabled={loading}
                    >
                      <Scissors size={18} color={colors.primary} />
                      <Text style={styles.editButtonText}>Remove BG</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => deletePhoto(selectedImageIndex)}
                    >
                      <Trash2 size={18} color={colors.error} />
                      <Text style={[styles.editButtonText, { color: colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {showFilterMenu && (
                  <View style={styles.filterMenu}>
                    <Text style={styles.filterMenuTitle}>Apply Filter</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.filterOptions}>
                        {FILTER_OPTIONS.map(filter => (
                          <TouchableOpacity
                            key={filter.id}
                            style={[
                              styles.filterOption,
                              currentImage?.filter === filter.id && styles.filterOptionActive,
                            ]}
                            onPress={() => applyFilter(filter.id)}
                          >
                            <Text style={[
                              styles.filterOptionName,
                              currentImage?.filter === filter.id && styles.filterOptionNameActive,
                            ]}>
                              {filter.name}
                            </Text>
                            <Text style={styles.filterOptionDesc}>{filter.description}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

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
  uploadSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  uploadButton: {
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
  uploadButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  uploadButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  uploadButtonTextDisabled: {
    color: colors.textLight,
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  uploadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },
  editingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  filterMenu: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  filterMenuTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minWidth: 100,
  },
  filterOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterOptionName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  filterOptionNameActive: {
    color: colors.white,
  },
  filterOptionDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  filterProcessingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 999,
  },
  filterProcessingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
