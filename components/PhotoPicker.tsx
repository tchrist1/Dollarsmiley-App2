import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Platform, ActionSheetIOS } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { Camera, X, Star, GripVertical, Sparkles } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface PhotoPickerProps {
  label?: string;
  helperText?: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  error?: string;
  aiAssistEnabled?: boolean;
  onAiImageAssist?: () => void;
}

interface DraggablePhotoProps {
  photo: string;
  index: number;
  isFeatured: boolean;
  onRemove: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  totalPhotos: number;
}

function DraggablePhoto({ photo, index, isFeatured, onRemove, onMove, totalPhotos }: DraggablePhotoProps) {
  const translateX = useSharedValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const movePhoto = (direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? index - 1 : index + 1;
    if (toIndex >= 0 && toIndex < totalPhotos) {
      onMove(index, toIndex);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsDragging)(true);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const threshold = 60;
      if (event.translationX < -threshold && index < totalPhotos - 1) {
        runOnJS(movePhoto)('right');
      } else if (event.translationX > threshold && index > 0) {
        runOnJS(movePhoto)('left');
      }
      translateX.value = withSpring(0);
      runOnJS(setIsDragging)(false);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    zIndex: isDragging ? 10 : 1,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.photoWrapper, animatedStyle]}>
        <View style={styles.photoContainer}>
          <Image source={{ uri: photo }} style={styles.photo} />

          {isFeatured && (
            <View style={styles.featuredBadge}>
              <Star size={12} color={colors.white} fill={colors.white} />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}

          <View style={styles.dragHandle}>
            <GripVertical size={20} color={colors.white} />
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
            activeOpacity={0.7}
          >
            <X size={16} color={colors.white} />
          </TouchableOpacity>

          {totalPhotos > 1 && (
            <View style={styles.reorderControls}>
              {index > 0 && (
                <TouchableOpacity
                  style={styles.reorderButton}
                  onPress={() => movePhoto('left')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reorderButtonText}>←</Text>
                </TouchableOpacity>
              )}
              {index < totalPhotos - 1 && (
                <TouchableOpacity
                  style={styles.reorderButton}
                  onPress={() => movePhoto('right')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reorderButtonText}>→</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function PhotoPicker({
  label,
  helperText,
  photos,
  onPhotosChange,
  maxPhotos = 5,
  error,
  aiAssistEnabled = false,
  onAiImageAssist,
}: PhotoPickerProps) {
  const handleAddPhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Maximum Photos', `You can only add up to ${maxPhotos} photos.`);
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await pickImage();
          }
        }
      );
    } else {
      Alert.alert(
        'Add Photo',
        'Choose an option',
        [
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhotos = [...photos, result.assets[0].uri];
      onPhotosChange(newPhotos);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is required to select photos.');
      return;
    }

    const remainingSlots = maxPhotos - photos.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newPhotoUris = result.assets.map(asset => asset.uri);
      const photosToAdd = newPhotoUris.slice(0, remainingSlots);
      const newPhotos = [...photos, ...photosToAdd];
      onPhotosChange(newPhotos);

      if (newPhotoUris.length > remainingSlots) {
        Alert.alert(
          'Selection Limit',
          `Only ${remainingSlots} photo(s) could be added. You've reached the maximum of ${maxPhotos} photos.`
        );
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleMovePhoto = (fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);
    onPhotosChange(newPhotos);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {photos.length > 0 && (
        <View style={styles.featuredInfo}>
          <Star size={14} color={colors.primary} fill={colors.primary} />
          <Text style={styles.featuredInfoText}>
            First photo will be featured. Drag or use arrows to reorder.
          </Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPhoto}
          activeOpacity={0.7}
        >
          <Camera size={32} color={colors.primary} />
          <Text style={styles.addButtonText}>Add Photo</Text>
          <Text style={styles.photoCount}>
            {photos.length}/{maxPhotos}
          </Text>
        </TouchableOpacity>

        {onAiImageAssist && (
          <TouchableOpacity
            style={[
              styles.aiImageButton,
              !aiAssistEnabled && styles.aiImageButtonDisabled,
            ]}
            onPress={aiAssistEnabled ? onAiImageAssist : undefined}
            activeOpacity={aiAssistEnabled ? 0.7 : 1}
          >
            <Sparkles size={28} color={aiAssistEnabled ? colors.primary : colors.textLight} />
            <Text style={[
              styles.aiImageButtonText,
              !aiAssistEnabled && styles.aiImageButtonTextDisabled,
            ]}>
              AI Image Assist
            </Text>
            {!aiAssistEnabled && (
              <Text style={styles.aiImageDisabledHint}>
                Enable AI Assist
              </Text>
            )}
          </TouchableOpacity>
        )}

        {photos.map((photo, index) => (
          <DraggablePhoto
            key={`${photo}-${index}`}
            photo={photo}
            index={index}
            isFeatured={index === 0}
            onRemove={() => handleRemovePhoto(index)}
            onMove={handleMovePhoto}
            totalPhotos={photos.length}
          />
        ))}
      </ScrollView>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.helperText}>
        {helperText || `You can add up to ${maxPhotos} photos at once. The first photo will be the main display image.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featuredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight || `${colors.primary}15`,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  featuredInfoText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  photosContainer: {
    flexDirection: 'row',
  },
  addButton: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  addButtonText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  photoCount: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  photoWrapper: {
    marginRight: spacing.sm,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    ...shadows.md,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  dragHandle: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  reorderControls: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    gap: 4,
  },
  reorderButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  reorderButtonText: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  aiImageButton: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  aiImageButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  aiImageButtonText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  aiImageButtonTextDisabled: {
    color: colors.textLight,
  },
  aiImageDisabledHint: {
    fontSize: 9,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
});
