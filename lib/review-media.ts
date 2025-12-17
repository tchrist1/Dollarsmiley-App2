import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export interface ReviewMedia {
  id: string;
  review_id: string;
  media_type: 'photo' | 'video';
  file_path: string;
  file_url: string;
  thumbnail_url?: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  order_index: number;
  moderation_status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

const STORAGE_BUCKET = 'review-media';

/**
 * Upload media file to storage
 */
export async function uploadReviewMedia(
  reviewId: string,
  fileUri: string,
  mediaType: 'photo' | 'video',
  metadata: {
    mimeType: string;
    width?: number;
    height?: number;
    duration?: number;
  }
): Promise<{ url: string; path: string; size: number } | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) throw new Error('File not found');

    // Generate unique filename
    const ext = metadata.mimeType.split('/')[1];
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `${user.id}/${reviewId}/${fileName}`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64' as any,
    });

    // Convert base64 to array buffer
    const arrayBuffer = decode(base64);

    // Upload to storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: metadata.mimeType,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
      size: fileInfo.size || 0,
    };
  } catch (error) {
    console.error('Error uploading media:', error);
    return null;
  }
}

/**
 * Add media record to database
 */
export async function addReviewMedia(
  reviewId: string,
  mediaType: 'photo' | 'video',
  filePath: string,
  fileUrl: string,
  metadata: {
    fileSize: number;
    mimeType: string;
    width?: number;
    height?: number;
    duration?: number;
    thumbnailUrl?: string;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('add_review_media', {
      review_id_param: reviewId,
      media_type_param: mediaType,
      file_path_param: filePath,
      file_url_param: fileUrl,
      thumbnail_url_param: metadata.thumbnailUrl,
      file_size_param: metadata.fileSize,
      mime_type_param: metadata.mimeType,
      width_param: metadata.width,
      height_param: metadata.height,
      duration_param: metadata.duration,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding media record:', error);
    return null;
  }
}

/**
 * Upload and save review media
 */
export async function uploadAndSaveReviewMedia(
  reviewId: string,
  fileUri: string,
  mediaType: 'photo' | 'video',
  metadata: {
    mimeType: string;
    width?: number;
    height?: number;
    duration?: number;
  }
): Promise<string | null> {
  try {
    // Upload file
    const uploadResult = await uploadReviewMedia(reviewId, fileUri, mediaType, metadata);
    if (!uploadResult) throw new Error('Upload failed');

    // Add database record
    const mediaId = await addReviewMedia(reviewId, mediaType, uploadResult.path, uploadResult.url, {
      fileSize: uploadResult.size,
      mimeType: metadata.mimeType,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
    });

    return mediaId;
  } catch (error) {
    console.error('Error uploading and saving media:', error);
    return null;
  }
}

/**
 * Get media for a review
 */
export async function getReviewMedia(reviewId: string): Promise<ReviewMedia[]> {
  try {
    const { data, error } = await supabase
      .from('review_media')
      .select('*')
      .eq('review_id', reviewId)
      .eq('moderation_status', 'Approved')
      .order('order_index', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting review media:', error);
    return [];
  }
}

/**
 * Get review with media
 */
export async function getReviewWithMedia(reviewId: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_review_with_media', {
      review_id_param: reviewId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting review with media:', error);
    return null;
  }
}

/**
 * Delete media
 */
export async function deleteReviewMedia(mediaId: string): Promise<boolean> {
  try {
    // Get media details first to delete from storage
    const { data: media, error: fetchError } = await supabase
      .from('review_media')
      .select('file_path')
      .eq('id', mediaId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([media.file_path]);

    if (storageError) {
      console.warn('Storage deletion failed:', storageError);
    }

    // Delete from database
    const { data, error } = await supabase.rpc('delete_review_media', {
      media_id_param: mediaId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error deleting media:', error);
    return false;
  }
}

/**
 * Reorder media
 */
export async function reorderReviewMedia(mediaId: string, newOrder: number): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('reorder_review_media', {
      media_id_param: mediaId,
      new_order_param: newOrder,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error reordering media:', error);
    return false;
  }
}

/**
 * Get media needing moderation (admin only)
 */
export async function getMediaNeedingModeration(limit: number = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_media_needing_moderation', {
      limit_param: limit,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting media for moderation:', error);
    return [];
  }
}

/**
 * Moderate media (admin only)
 */
export async function moderateReviewMedia(
  mediaId: string,
  status: 'Approved' | 'Rejected'
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('moderate_review_media', {
      media_id_param: mediaId,
      status_param: status,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error moderating media:', error);
    return false;
  }
}

/**
 * Get review media statistics
 */
export async function getReviewMediaStats(): Promise<{
  total_media: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  total_size_mb: number;
  avg_per_review: number;
} | null> {
  try {
    const { data, error } = await supabase.rpc('get_review_media_stats');

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting media stats:', error);
    return null;
  }
}

/**
 * Validate media constraints
 */
export function validateMediaConstraints(
  type: 'photo' | 'video',
  fileSize: number,
  duration?: number
): { valid: boolean; error?: string } {
  const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_VIDEO_DURATION = 60; // 60 seconds

  if (type === 'photo') {
    if (fileSize > MAX_PHOTO_SIZE) {
      return {
        valid: false,
        error: `Photo too large. Maximum size is ${MAX_PHOTO_SIZE / 1024 / 1024}MB`,
      };
    }
  } else if (type === 'video') {
    if (fileSize > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `Video too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB`,
      };
    }
    if (duration && duration > MAX_VIDEO_DURATION) {
      return {
        valid: false,
        error: `Video too long. Maximum duration is ${MAX_VIDEO_DURATION} seconds`,
      };
    }
  }

  return { valid: true };
}

/**
 * Generate thumbnail for video (placeholder)
 */
export async function generateVideoThumbnail(videoUri: string): Promise<string | null> {
  // This would require a video processing library like expo-video-thumbnails
  // For now, return null and handle on backend
  console.warn('Video thumbnail generation not implemented');
  return null;
}

/**
 * Batch upload multiple media files
 */
export async function batchUploadReviewMedia(
  reviewId: string,
  mediaItems: Array<{
    uri: string;
    type: 'photo' | 'video';
    mimeType: string;
    width?: number;
    height?: number;
    duration?: number;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<{ successful: number; failed: number; errors: string[] }> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];

    try {
      onProgress?.(i + 1, mediaItems.length);

      const mediaId = await uploadAndSaveReviewMedia(reviewId, item.uri, item.type, {
        mimeType: item.mimeType,
        width: item.width,
        height: item.height,
        duration: item.duration,
      });

      if (mediaId) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push(`Failed to upload ${item.type}`);
      }
    } catch (error: any) {
      results.failed++;
      results.errors.push(error.message || 'Upload failed');
    }
  }

  return results;
}

/**
 * Check if storage bucket exists, create if not
 */
export async function ensureStorageBucket(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);

    if (error && error.message.includes('not found')) {
      // Create bucket
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 100 * 1024 * 1024, // 100MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/quicktime',
          'video/x-msvideo',
        ],
      });

      if (createError) {
        console.error('Failed to create storage bucket:', createError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring storage bucket:', error);
    return false;
  }
}
