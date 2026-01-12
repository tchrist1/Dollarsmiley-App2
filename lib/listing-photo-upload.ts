import { supabase } from './supabase';
import { fileUriToByteArray, getFileExtension, getContentType } from './file-upload-utils';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadListingPhoto(
  listingId: string,
  imageUri: string,
  index: number
): Promise<PhotoUploadResult> {
  try {
    const byteArray = await fileUriToByteArray(imageUri);

    const fileExt = getFileExtension(imageUri);
    const fileName = `${listingId}/photo-${index}-${Date.now()}.${fileExt}`;
    const contentType = getContentType(fileExt);

    const { data, error } = await supabase.storage
      .from('listing-photos')
      .upload(fileName, byteArray, {
        contentType,
        upsert: false,
      });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const { data: urlData } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Photo upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function uploadMultipleListingPhotos(
  listingId: string,
  imageUris: string[]
): Promise<{ success: boolean; urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];
  const BATCH_SIZE = 3; // Upload 3 images at a time

  // Process uploads in parallel batches
  for (let i = 0; i < imageUris.length; i += BATCH_SIZE) {
    const batch = imageUris.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map((uri, batchIndex) =>
      uploadListingPhoto(listingId, uri, i + batchIndex)
    );

    const results = await Promise.all(batchPromises);

    results.forEach((result) => {
      if (result.success && result.url) {
        urls.push(result.url);
      } else {
        errors.push(result.error || 'Unknown error');
      }
    });
  }

  return {
    success: errors.length === 0,
    urls,
    errors,
  };
}

export async function deleteListingPhoto(photoUrl: string): Promise<void> {
  try {
    const path = photoUrl.split('/listing-photos/')[1];
    if (path) {
      await supabase.storage.from('listing-photos').remove([path]);
    }
  } catch (error) {
    console.error('Error deleting listing photo:', error);
  }
}
