import { useState, useEffect, useRef } from 'react';
import { Image } from 'react-native';
import { MarketplaceListing } from '@/types/database';

interface UseImagePreloadOptions {
  listings: MarketplaceListing[];
  enabled: boolean;
  maxListings?: number; // Max listings to preload (default 6)
  resetKey?: string; // Change this to force reset (e.g., on filter/search change)
}

interface UseImagePreloadReturn {
  imagesReady: boolean;
  preloadProgress: number;
  totalImages: number;
}

/**
 * Preloads images for the first N listings to prevent image pop-in
 * on Home screen initial load.
 *
 * RULES:
 * - Only preloads first N listings (default 6, max 6)
 * - Tracks all images: featured images + provider avatars
 * - Returns imagesReady=true only when ALL images loaded OR timed out
 * - Non-blocking: 5 second timeout to prevent infinite skeleton
 */
export function useImagePreload({
  listings,
  enabled,
  maxListings = 6,
  resetKey = '',
}: UseImagePreloadOptions): UseImagePreloadReturn {
  const [imagesReady, setImagesReady] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isPreloadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const preloadedUrlsRef = useRef<string>(''); // Track actual preloaded URLs as hash
  const hasCompletedFirstPreloadRef = useRef(false); // Lock after first successful preload
  const lastResetKeyRef = useRef<string>(''); // Track reset key changes

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Check if resetKey changed (user applied filters/search)
    if (resetKey && resetKey !== lastResetKeyRef.current) {
      if (__DEV__) {
        console.log('[ImagePreload] Reset key changed, unlocking for new preload');
      }
      hasCompletedFirstPreloadRef.current = false;
      setImagesReady(false);
      preloadedUrlsRef.current = '';
      lastResetKeyRef.current = resetKey;
    }

    // Reset if disabled or no listings
    if (!enabled || listings.length === 0) {
      // Only reset if we haven't completed first preload yet
      if (!hasCompletedFirstPreloadRef.current) {
        setImagesReady(false);
        setPreloadProgress(0);
        setTotalImages(0);
        isPreloadingRef.current = false;
        preloadedUrlsRef.current = '';
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Extract image URLs from first N listings
    const firstNListings = listings.slice(0, Math.min(maxListings, 6));
    const imageUrls: string[] = [];

    for (const listing of firstNListings) {
      // Add featured image
      if (listing.marketplace_type === 'Service') {
        if (listing.image_url) imageUrls.push(listing.image_url);
        if (listing.featured_image_url && listing.featured_image_url !== listing.image_url) {
          imageUrls.push(listing.featured_image_url);
        }
      } else if (listing.marketplace_type === 'Job') {
        if (listing.photos && listing.photos.length > 0) {
          imageUrls.push(listing.photos[0]);
        }
        if (listing.featured_image_url && !listing.photos?.includes(listing.featured_image_url)) {
          imageUrls.push(listing.featured_image_url);
        }
      }

      // Add provider/customer avatar
      if (listing.marketplace_type === 'Service' && listing.provider?.avatar_url) {
        imageUrls.push(listing.provider.avatar_url);
      } else if (listing.marketplace_type === 'Job' && listing.customer?.avatar_url) {
        imageUrls.push(listing.customer.avatar_url);
      }
    }

    // Remove duplicates and nulls
    const uniqueUrls = Array.from(new Set(imageUrls)).filter(url => url && url.trim() !== '');

    // Create stable hash of URLs to detect actual changes
    const urlsHash = uniqueUrls.sort().join('|');

    // If we already preloaded these exact images, skip
    if (preloadedUrlsRef.current === urlsHash && imagesReady) {
      if (__DEV__) {
        console.log('[ImagePreload] Already preloaded these images, skipping');
      }
      return;
    }

    // CRITICAL: Once first preload completes, lock it until URLs genuinely change
    // This prevents resets during snapshot → live data transitions
    if (hasCompletedFirstPreloadRef.current && imagesReady) {
      if (__DEV__) {
        console.log('[ImagePreload] First preload completed, staying ready for stability');
      }
      return;
    }

    // Prevent re-running if already preloading THE SAME URLs
    if (isPreloadingRef.current && preloadedUrlsRef.current === urlsHash) {
      return;
    }

    // If URLs changed, reset state
    if (preloadedUrlsRef.current !== urlsHash) {
      setImagesReady(false);
      setPreloadProgress(0);
      isPreloadingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    if (uniqueUrls.length === 0) {
      // No images to preload, mark as ready immediately
      setImagesReady(true);
      setTotalImages(0);
      setPreloadProgress(0);
      isPreloadingRef.current = false;
      preloadedUrlsRef.current = urlsHash;
      return;
    }

    // Start preloading
    isPreloadingRef.current = true;
    preloadedUrlsRef.current = urlsHash;

    setTotalImages(uniqueUrls.length);
    setPreloadProgress(0);

    if (__DEV__) {
      console.log(`[ImagePreload] Starting preload for ${uniqueUrls.length} images`);
    }

    // Safety timeout: Force ready after 5 seconds
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && isPreloadingRef.current) {
        if (__DEV__) {
          console.log('[ImagePreload] Timeout reached, forcing imagesReady=true');
        }
        setImagesReady(true);
        isPreloadingRef.current = false;
      }
    }, 5000);

    // Preload all images
    let loadedCount = 0;

    const preloadPromises = uniqueUrls.map((url) =>
      Image.prefetch(url)
        .then(() => {
          if (!isMountedRef.current) return;
          loadedCount++;
          setPreloadProgress(loadedCount);

          if (__DEV__) {
            console.log(`[ImagePreload] Loaded ${loadedCount}/${uniqueUrls.length}: ${url.substring(0, 50)}...`);
          }
        })
        .catch((error) => {
          if (!isMountedRef.current) return;
          loadedCount++;
          setPreloadProgress(loadedCount);

          if (__DEV__) {
            console.warn(`[ImagePreload] Failed to load image: ${url}`, error);
          }
        })
    );

    Promise.allSettled(preloadPromises).then(() => {
      if (!isMountedRef.current) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setImagesReady(true);
      isPreloadingRef.current = false;
      hasCompletedFirstPreloadRef.current = true; // Lock after first success

      if (__DEV__) {
        console.log(`[ImagePreload] All images ready: ${loadedCount}/${uniqueUrls.length} loaded successfully`);
      }
    });

  }, [listings, enabled, maxListings, resetKey]);

  return {
    imagesReady,
    preloadProgress,
    totalImages,
  };
}
