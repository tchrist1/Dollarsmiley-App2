import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Camera, Video, X, Upload, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export interface MediaItem {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  thumbnail?: string;
}

interface ReviewMediaUploadProps {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxMedia?: number;
  maxPhotoSize?: number;
  maxVideoSize?: number;
  maxVideoDuration?: number;
}

export function ReviewMediaUpload({
  media,
  onMediaChange,
  maxMedia = 10,
  maxPhotoSize = 10 * 1024 * 1024, // 10MB
  maxVideoSize = 100 * 1024 * 1024, // 100MB
  maxVideoDuration = 60, // 60 seconds
}: ReviewMediaUploadProps) {
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please allow camera and photo library access to upload media.'
      );
      return false;
    }

    return true;
  };

  const validatePhoto = (asset: ImagePicker.ImagePickerAsset): string | null => {
    if (!asset.fileSize) return null;

    if (asset.fileSize > maxPhotoSize) {
      return `Photo is too large. Maximum size is ${Math.round(maxPhotoSize / 1024 / 1024)}MB`;
    }

    return null;
  };

  const validateVideo = (asset: ImagePicker.ImagePickerAsset): string | null => {
    if (asset.fileSize && asset.fileSize > maxVideoSize) {
      return `Video is too large. Maximum size is ${Math.round(maxVideoSize / 1024 / 1024)}MB`;
    }

    if (asset.duration && asset.duration > maxVideoDuration) {
      return `Video is too long. Maximum duration is ${maxVideoDuration} seconds`;
    }

    return null;
  };

  const handleTakePhoto = async () => {
    if (media.length >= maxMedia) {
      Alert.alert('Limit Reached', `You can upload up to ${maxMedia} media files`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const error = validatePhoto(asset);

        if (error) {
          Alert.alert('Invalid Photo', error);
          return;
        }

        const newMedia: MediaItem = {
          id: `temp-${Date.now()}`,
          uri: asset.uri,
          type: 'photo',
          mimeType: 'image/jpeg',
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
        };

        onMediaChange([...media, newMedia]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePickPhotos = async () => {
    if (media.length >= maxMedia) {
      Alert.alert('Limit Reached', `You can upload up to ${maxMedia} media files`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxMedia - media.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        const validAssets: MediaItem[] = [];
        const errors: string[] = [];

        for (const asset of result.assets) {
          const error = validatePhoto(asset);
          if (error) {
            errors.push(error);
          } else {
            validAssets.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              uri: asset.uri,
              type: 'photo',
              mimeType: 'image/jpeg',
              width: asset.width,
              height: asset.height,
              fileSize: asset.fileSize,
            });
          }
        }

        if (errors.length > 0) {
          Alert.alert('Some Photos Invalid', errors[0]);
        }

        if (validAssets.length > 0) {
          onMediaChange([...media, ...validAssets]);
        }
      }
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to select photos');
    }
  };

  const handlePickVideo = async () => {
    if (media.length >= maxMedia) {
      Alert.alert('Limit Reached', `You can upload up to ${maxMedia} media files`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
        videoMaxDuration: maxVideoDuration,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const error = validateVideo(asset);

        if (error) {
          Alert.alert('Invalid Video', error);
          return;
        }

        const newMedia: MediaItem = {
          id: `temp-${Date.now()}`,
          uri: asset.uri,
          type: 'video',
          mimeType: 'video/mp4',
          width: asset.width,
          height: asset.height,
          duration: asset.duration,
          fileSize: asset.fileSize,
        };

        onMediaChange([...media, newMedia]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const handleRemoveMedia = (id: string) => {
    Alert.alert('Remove Media', 'Are you sure you want to remove this media?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          onMediaChange(media.filter((item) => item.id !== id));
        },
      },
    ]);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Photos & Videos (Optional)</Text>
      <Text style={styles.description}>
        Share your experience with photos or videos ({media.length}/{maxMedia})
      </Text>

      {media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaList}>
          {media.map((item) => (
            <View key={item.id} style={styles.mediaItem}>
              {item.type === 'photo' ? (
                <Image source={{ uri: item.uri }} style={styles.mediaPreview} />
              ) : (
                <View style={styles.videoPreview}>
                  <Video size={40} color={colors.white} />
                  {item.duration && (
                    <Text style={styles.videoDuration}>{formatDuration(item.duration)}</Text>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMedia(item.id)}
              >
                <X size={16} color={colors.white} />
              </TouchableOpacity>
              {item.fileSize && (
                <Text style={styles.mediaSize}>{formatFileSize(item.fileSize)}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, media.length >= maxMedia && styles.actionButtonDisabled]}
          onPress={handleTakePhoto}
          disabled={media.length >= maxMedia || uploading}
        >
          <Camera size={20} color={media.length >= maxMedia ? colors.border : colors.primary} />
          <Text
            style={[
              styles.actionButtonText,
              media.length >= maxMedia && styles.actionButtonTextDisabled,
            ]}
          >
            Take Photo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, media.length >= maxMedia && styles.actionButtonDisabled]}
          onPress={handlePickPhotos}
          disabled={media.length >= maxMedia || uploading}
        >
          <ImageIcon
            size={20}
            color={media.length >= maxMedia ? colors.border : colors.primary}
          />
          <Text
            style={[
              styles.actionButtonText,
              media.length >= maxMedia && styles.actionButtonTextDisabled,
            ]}
          >
            Choose Photos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, media.length >= maxMedia && styles.actionButtonDisabled]}
          onPress={handlePickVideo}
          disabled={media.length >= maxMedia || uploading}
        >
          <Video size={20} color={media.length >= maxMedia ? colors.border : colors.primary} />
          <Text
            style={[
              styles.actionButtonText,
              media.length >= maxMedia && styles.actionButtonTextDisabled,
            ]}
          >
            Add Video
          </Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.uploadingText}>Uploading media...</Text>
        </View>
      )}

      <View style={styles.limits}>
        <Text style={styles.limitText}>• Max {maxMedia} files</Text>
        <Text style={styles.limitText}>
          • Photos: up to {Math.round(maxPhotoSize / 1024 / 1024)}MB
        </Text>
        <Text style={styles.limitText}>
          • Videos: up to {Math.round(maxVideoSize / 1024 / 1024)}MB, {maxVideoDuration}s max
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  mediaList: {
    marginBottom: spacing.md,
  },
  mediaItem: {
    marginRight: spacing.md,
    position: 'relative',
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  videoPreview: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: colors.white,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSize: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  actionButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  actionButtonTextDisabled: {
    color: colors.border,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  uploadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  limits: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  limitText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
