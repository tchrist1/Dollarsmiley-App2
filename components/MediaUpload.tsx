import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { Camera, Image as ImageIcon, Video, X, Play } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export interface MediaFile {
  uri: string;
  type: 'image' | 'video';
  name: string;
  size?: number;
}

interface MediaUploadProps {
  maxFiles?: number;
  maxVideoSize?: number;
  allowImages?: boolean;
  allowVideos?: boolean;
  onMediaSelected?: (files: MediaFile[]) => void;
}

export default function MediaUpload({
  maxFiles = 5,
  maxVideoSize = 100 * 1024 * 1024,
  allowImages = true,
  allowVideos = true,
  onMediaSelected,
}: MediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollState, setScrollState] = useState({
    scrollX: 0,
    contentWidth: 0,
    containerWidth: 0,
  });

  const thumbPosition = useSharedValue(0);
  const isDraggingThumb = useSharedValue(false);

  const showScrollIndicator = scrollState.contentWidth > scrollState.containerWidth && scrollState.containerWidth > 0 && mediaFiles.length > 0;
  const thumbWidthRatio = scrollState.containerWidth / scrollState.contentWidth;
  const thumbWidth = Math.max(60, scrollState.containerWidth * thumbWidthRatio);
  const maxThumbOffset = scrollState.containerWidth - thumbWidth;
  const maxScrollX = scrollState.contentWidth - scrollState.containerWidth;

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setScrollState({
      scrollX: contentOffset.x,
      contentWidth: contentSize.width,
      containerWidth: layoutMeasurement.width,
    });

    if (!isDraggingThumb.value && maxScrollX > 0) {
      const scrollPercentage = contentOffset.x / maxScrollX;
      thumbPosition.value = scrollPercentage * maxThumbOffset;
    }
  };

  const handleContentSizeChange = (width: number, height: number) => {
    setScrollState(prev => ({
      ...prev,
      contentWidth: width,
    }));
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setScrollState(prev => ({
      ...prev,
      containerWidth: event.nativeEvent.layout.width,
    }));
  };

  const scrollToPosition = (thumbX: number) => {
    if (maxThumbOffset > 0 && maxScrollX > 0) {
      const scrollPercentage = thumbX / maxThumbOffset;
      const targetScrollX = scrollPercentage * maxScrollX;
      scrollViewRef.current?.scrollTo({ x: targetScrollX, animated: false });
    }
  };

  const thumbPanGesture = Gesture.Pan()
    .onStart(() => {
      isDraggingThumb.value = true;
    })
    .onUpdate((event) => {
      const newPosition = thumbPosition.value + event.translationX;
      const clampedPosition = Math.max(0, Math.min(maxThumbOffset, newPosition));
      thumbPosition.value = clampedPosition;
      runOnJS(scrollToPosition)(clampedPosition);
    })
    .onEnd(() => {
      isDraggingThumb.value = false;
    });

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbPosition.value }],
  }));

  const requestPermissions = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestPermissions('library');
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please grant access to your photos');
        return;
      }

      const remainingSlots = maxFiles - mediaFiles.length;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: allowVideos
          ? ['images', 'videos']
          : ['images'],
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled) {
        addMediaFiles(result.assets);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions('camera');
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please grant camera access');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        addMediaFiles(result.assets);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const addMediaFiles = (assets: ImagePicker.ImagePickerAsset[]) => {
    const newFiles: MediaFile[] = [];

    for (const asset of assets) {
      if (mediaFiles.length + newFiles.length >= maxFiles) {
        Alert.alert('Limit Reached', `You can only upload up to ${maxFiles} files`);
        break;
      }

      const isVideo = asset.type === 'video';

      if (isVideo && !allowVideos) {
        Alert.alert('Not Allowed', 'Videos are not allowed');
        continue;
      }

      if (!isVideo && !allowImages) {
        Alert.alert('Not Allowed', 'Images are not allowed');
        continue;
      }

      if (isVideo && asset.fileSize && asset.fileSize > maxVideoSize) {
        Alert.alert(
          'File Too Large',
          `Video size must be less than ${Math.round(maxVideoSize / (1024 * 1024))}MB`
        );
        continue;
      }

      const fileName =
        asset.fileName ||
        `${isVideo ? 'video' : 'image'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;

      newFiles.push({
        uri: asset.uri,
        type: isVideo ? 'video' : 'image',
        name: fileName,
        size: asset.fileSize,
      });
    }

    const updatedFiles = [...mediaFiles, ...newFiles];
    setMediaFiles(updatedFiles);
    onMediaSelected?.(updatedFiles);
  };

  const removeMedia = (index: number) => {
    const updatedFiles = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(updatedFiles);
    onMediaSelected?.(updatedFiles);
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Add Media',
      'Choose how you want to add media',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Media Grid */}
      {mediaFiles.length > 0 && (
        <View style={styles.scrollWrapper}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaScroll}
            contentContainerStyle={styles.mediaScrollContent}
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
            onLayout={handleLayout}
            scrollEventThrottle={16}
          >
          {mediaFiles.map((media, index) => (
            <View key={index} style={styles.mediaItem}>
              {media.type === 'image' ? (
                <Image source={{ uri: media.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.videoContainer}>
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                  <View style={styles.videoOverlay}>
                    <Play size={32} color={colors.white} fill={colors.white} />
                  </View>
                  <View style={styles.videoBadge}>
                    <Video size={12} color={colors.white} />
                    <Text style={styles.videoBadgeText}>VIDEO</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeMedia(index)}
              >
                <X size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add More Button */}
          {mediaFiles.length < maxFiles && (
            <TouchableOpacity style={styles.addMoreButton} onPress={showMediaOptions}>
              <ImageIcon size={32} color={colors.textSecondary} />
              <Text style={styles.addMoreText}>Add More</Text>
            </TouchableOpacity>
          )}
          </ScrollView>

          {showScrollIndicator && (
            <View style={styles.customScrollIndicator}>
              <View style={styles.scrollTrack}>
                <GestureDetector gesture={thumbPanGesture}>
                  <Animated.View
                    style={[
                      styles.scrollThumb,
                      { width: thumbWidth },
                      thumbAnimatedStyle,
                    ]}
                  />
                </GestureDetector>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Add Media Buttons */}
      {mediaFiles.length === 0 && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={takePhoto}>
            <Camera size={24} color={colors.primary} />
            <Text style={styles.addButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} onPress={pickImage}>
            <ImageIcon size={24} color={colors.primary} />
            <Text style={styles.addButtonText}>
              {allowVideos ? 'Photo/Video' : 'Choose Photo'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Text */}
      <Text style={styles.infoText}>
        {allowImages && allowVideos
          ? `Add up to ${maxFiles} photos or videos`
          : allowVideos
          ? `Add up to ${maxFiles} videos`
          : `Add up to ${maxFiles} photos`}
      </Text>

      {/* Uploading Indicator */}
      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  scrollWrapper: {
    position: 'relative',
  },
  mediaScroll: {
    marginHorizontal: -spacing.lg,
  },
  mediaScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  customScrollIndicator: {
    width: '100%',
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  scrollTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scrollThumb: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
    minWidth: 60,
  },
  mediaItem: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreButton: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  addMoreText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  uploadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
