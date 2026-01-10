import { supabase } from './supabase';

export type ListingStatus = 'Draft' | 'Active' | 'Paused' | 'Archived';

export interface ListingStatusUpdate {
  status: ListingStatus;
  is_active: boolean;
  updated_at?: string;
}

export interface PublishValidationError {
  field: string;
  message: string;
}

export interface PublishValidationResult {
  valid: boolean;
  errors: PublishValidationError[];
}

export function deriveIsActive(status: ListingStatus): boolean {
  return status === 'Active';
}

export function getStatusUpdateData(status: ListingStatus): ListingStatusUpdate {
  return {
    status,
    is_active: deriveIsActive(status),
    updated_at: new Date().toISOString(),
  };
}

export function validateListingForPublish(listing: {
  title?: string;
  category_id?: string;
  photos?: any;
  base_price?: number;
  pricing_type?: string;
  listing_type?: string;
}): PublishValidationResult {
  const errors: PublishValidationError[] = [];

  if (!listing.title || listing.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  if (!listing.category_id) {
    errors.push({ field: 'category_id', message: 'Category is required' });
  }

  const photos = listing.photos;
  const hasPhotos = Array.isArray(photos)
    ? photos.length > 0
    : (typeof photos === 'string' && photos !== '[]');

  if (!hasPhotos) {
    errors.push({ field: 'photos', message: 'At least one photo is required' });
  }

  if (!listing.base_price || listing.base_price <= 0) {
    errors.push({ field: 'base_price', message: 'Valid price is required' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function updateListingStatus(
  listingId: string,
  newStatus: ListingStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData = getStatusUpdateData(newStatus);

    const { error } = await supabase
      .from('service_listings')
      .update(updateData)
      .eq('id', listingId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating listing status:', error);
    return { success: false, error: error.message };
  }
}

export async function publishListing(
  listingId: string,
  currentListingData?: any
): Promise<{ success: boolean; error?: string; validationErrors?: PublishValidationError[] }> {
  try {
    if (!currentListingData) {
      const { data, error } = await supabase
        .from('service_listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error) throw error;
      currentListingData = data;
    }

    const validation = validateListingForPublish(currentListingData);

    if (!validation.valid) {
      return {
        success: false,
        error: 'Listing does not meet publish requirements',
        validationErrors: validation.errors,
      };
    }

    const result = await updateListingStatus(listingId, 'Active');
    return result;
  } catch (error: any) {
    console.error('Error publishing listing:', error);
    return { success: false, error: error.message };
  }
}

export async function archiveListing(
  listingId: string
): Promise<{ success: boolean; error?: string }> {
  return updateListingStatus(listingId, 'Archived');
}

export async function restoreListing(
  listingId: string,
  targetStatus: 'Paused' | 'Active' = 'Paused'
): Promise<{ success: boolean; error?: string; validationErrors?: PublishValidationError[] }> {
  if (targetStatus === 'Active') {
    return publishListing(listingId);
  }

  return updateListingStatus(listingId, 'Paused');
}

export function getStatusColor(status: ListingStatus): string {
  const colors = {
    Active: '#10b981',
    Paused: '#f59e0b',
    Draft: '#9ca3af',
    Archived: '#ef4444',
  };
  return colors[status] || '#6b7280';
}

export function getStatusLabel(status: ListingStatus): string {
  return status;
}

export function getAllowedTransitions(currentStatus: ListingStatus): ListingStatus[] {
  const transitions: Record<ListingStatus, ListingStatus[]> = {
    Draft: ['Active', 'Archived'],
    Active: ['Paused', 'Archived'],
    Paused: ['Active', 'Archived'],
    Archived: ['Paused', 'Active'],
  };

  return transitions[currentStatus] || [];
}

export function getActionLabel(fromStatus: ListingStatus, toStatus: ListingStatus): string {
  if (toStatus === 'Active') {
    return fromStatus === 'Draft' ? 'Publish' : 'Activate';
  }
  if (toStatus === 'Paused') {
    return 'Pause';
  }
  if (toStatus === 'Archived') {
    return 'Archive';
  }
  return 'Update';
}
