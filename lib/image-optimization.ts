/**
 * Image Optimization Utilities
 *
 * Provides image caching, lazy loading, and optimization
 */

import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';
import { cache } from './caching';

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

const IMAGE_CACHE_DIR = `${FileSystem.cacheDirectory}images/`;

/**
 * Initialize image cache directory
 */
export async function initImageCache(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, {
        intermediates: true,
      });
    }
  } catch (error) {
    console.error('Failed to initialize image cache:', error);
  }
}

/**
 * Generate cache key for image
 */
function getImageCacheKey(url: string, options?: ImageOptimizationOptions): string {
  const optionsStr = options
    ? `_${options.width || ''}x${options.height || ''}_q${options.quality || 80}`
    : '';
  return `${encodeURIComponent(url)}${optionsStr}`;
}

/**
 * Get cached image path
 */
function getCachedImagePath(cacheKey: string): string {
  return `${IMAGE_CACHE_DIR}${cacheKey}`;
}

/**
 * Check if image is cached
 */
export async function isImageCached(url: string): Promise<boolean> {
  const cacheKey = getImageCacheKey(url);
  const filePath = getCachedImagePath(cacheKey);

  try {
    const info = await FileSystem.getInfoAsync(filePath);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Get cached image URI or download it
 */
export async function getCachedImageUri(
  url: string,
  options?: ImageOptimizationOptions
): Promise<string> {
  if (!url) return '';

  // Check if already cached
  const cacheKey = getImageCacheKey(url, options);
  const filePath = getCachedImagePath(cacheKey);

  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      return filePath;
    }
  } catch {
    // File doesn't exist, continue to download
  }

  // Download and cache
  try {
    await initImageCache();

    const downloadResult = await FileSystem.downloadAsync(url, filePath);

    if (downloadResult.status === 200) {
      return downloadResult.uri;
    }
  } catch (error) {
    console.error('Failed to download image:', error);
  }

  // Return original URL as fallback
  return url;
}

/**
 * Preload images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map((url) =>
    Image.prefetch(url).catch((error) => {
      console.error(`Failed to preload image: ${url}`, error);
    })
  );

  await Promise.all(promises);
}

/**
 * Clear image cache
 */
export async function clearImageCache(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(IMAGE_CACHE_DIR, { idempotent: true });
      await initImageCache();
    }
  } catch (error) {
    console.error('Failed to clear image cache:', error);
  }
}

/**
 * Get image cache size
 */
export async function getImageCacheSize(): Promise<number> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
    if (!dirInfo.exists) return 0;

    const files = await FileSystem.readDirectoryAsync(IMAGE_CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const filePath = `${IMAGE_CACHE_DIR}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Clean up old cached images (LRU)
 */
export async function cleanupImageCache(maxSizeMB = 100): Promise<void> {
  try {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const currentSize = await getImageCacheSize();

    if (currentSize <= maxSizeBytes) return;

    const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
    if (!dirInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(IMAGE_CACHE_DIR);

    // Get file info with modification times
    const fileInfos = await Promise.all(
      files.map(async (file) => {
        const filePath = `${IMAGE_CACHE_DIR}${file}`;
        const info = await FileSystem.getInfoAsync(filePath);
        return {
          path: filePath,
          modificationTime: info.exists && 'modificationTime' in info ? info.modificationTime : 0,
          size: info.exists && 'size' in info ? info.size : 0,
        };
      })
    );

    // Sort by modification time (oldest first)
    fileInfos.sort((a, b) => a.modificationTime - b.modificationTime);

    // Delete oldest files until we're under the limit
    let deletedSize = 0;
    for (const file of fileInfos) {
      if (currentSize - deletedSize <= maxSizeBytes) break;

      await FileSystem.deleteAsync(file.path, { idempotent: true });
      deletedSize += file.size;
    }

    console.log(`Cleaned up ${(deletedSize / 1024 / 1024).toFixed(2)}MB from image cache`);
  } catch (error) {
    console.error('Failed to cleanup image cache:', error);
  }
}

/**
 * Generate thumbnail URL (if using image CDN)
 */
export function getThumbnailUrl(url: string, size: number = 200): string {
  if (!url) return '';

  // If using Supabase Storage, add transformation parameters
  if (url.includes('supabase.co/storage')) {
    return `${url}?width=${size}&height=${size}&quality=80`;
  }

  // If using other CDN, add appropriate parameters
  // Example for Cloudinary:
  // return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill/`);

  return url;
}

/**
 * Get responsive image URL based on device width
 */
export function getResponsiveImageUrl(
  url: string,
  deviceWidth: number
): string {
  if (!url) return '';

  // Determine appropriate size based on device width
  let targetWidth: number;
  if (deviceWidth <= 480) {
    targetWidth = 480;
  } else if (deviceWidth <= 768) {
    targetWidth = 768;
  } else if (deviceWidth <= 1024) {
    targetWidth = 1024;
  } else {
    targetWidth = 1920;
  }

  return getThumbnailUrl(url, targetWidth);
}

/**
 * Lazy load image with placeholder
 */
import { useState, useEffect } from 'react';

export function useLazyImage(url: string, placeholder?: string) {
  const [imageUri, setImageUri] = useState(placeholder || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadImage() {
      try {
        const uri = await getCachedImageUri(url);
        if (mounted) {
          setImageUri(uri);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      }
    }

    if (url) {
      loadImage();
    }

    return () => {
      mounted = false;
    };
  }, [url]);

  return { imageUri, loading, error };
}

/**
 * Progressive image loading hook
 */
export function useProgressiveImage(
  lowQualityUrl: string,
  highQualityUrl: string
) {
  const [currentUrl, setCurrentUrl] = useState(lowQualityUrl);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Start with low quality
    setCurrentUrl(lowQualityUrl);

    // Load high quality in background
    Image.prefetch(highQualityUrl)
      .then(() => {
        setCurrentUrl(highQualityUrl);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load high quality image:', error);
        setLoading(false);
      });
  }, [lowQualityUrl, highQualityUrl]);

  return { currentUrl, loading };
}

/**
 * Batch image preloader
 */
export class ImagePreloader {
  private queue: string[] = [];
  private loading = false;
  private batchSize = 3;

  constructor(batchSize = 3) {
    this.batchSize = batchSize;
  }

  add(url: string) {
    if (!this.queue.includes(url)) {
      this.queue.push(url);
      this.processQueue();
    }
  }

  addBatch(urls: string[]) {
    urls.forEach((url) => {
      if (!this.queue.includes(url)) {
        this.queue.push(url);
      }
    });
    this.processQueue();
  }

  private async processQueue() {
    if (this.loading || this.queue.length === 0) return;

    this.loading = true;

    const batch = this.queue.splice(0, this.batchSize);

    await Promise.all(
      batch.map((url) =>
        getCachedImageUri(url).catch((error) => {
          console.error(`Failed to preload: ${url}`, error);
        })
      )
    );

    this.loading = false;

    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  clear() {
    this.queue = [];
  }

  getQueueLength() {
    return this.queue.length;
  }
}

/**
 * Image compression (for uploads)
 */
import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(
  uri: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<string> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = options;

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Failed to compress image:', error);
    return uri;
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  uri: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });
}

/**
 * Calculate aspect ratio
 */
export function calculateAspectRatio(
  width: number,
  height: number,
  containerWidth: number
): { width: number; height: number } {
  const aspectRatio = width / height;
  const calculatedHeight = containerWidth / aspectRatio;

  return {
    width: containerWidth,
    height: calculatedHeight,
  };
}
