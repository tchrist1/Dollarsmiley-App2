import { supabase } from './supabase';

/**
 * Bulk Operations for Admin Dashboard
 * Supports batch operations on users, listings, bookings, and more
 */

export type BulkOperationType =
  | 'suspend_users'
  | 'activate_users'
  | 'verify_users'
  | 'delete_users'
  | 'approve_listings'
  | 'reject_listings'
  | 'delete_listings'
  | 'cancel_bookings'
  | 'approve_verifications'
  | 'reject_verifications'
  | 'send_notifications'
  | 'update_subscription'
  | 'add_badge';

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  total: number;
}

export interface BulkOperationOptions {
  type: BulkOperationType;
  targetIds: string[];
  adminId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Execute bulk operation with error handling
 */
export async function executeBulkOperation(
  options: BulkOperationOptions
): Promise<BulkOperationResult> {
  const { type, targetIds, adminId, reason, metadata } = options;

  if (!targetIds || targetIds.length === 0) {
    throw new Error('No target IDs provided');
  }

  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
    total: targetIds.length,
  };

  // Execute operation based on type
  switch (type) {
    case 'suspend_users':
      return await bulkSuspendUsers(targetIds, adminId, reason, result);

    case 'activate_users':
      return await bulkActivateUsers(targetIds, adminId, result);

    case 'verify_users':
      return await bulkVerifyUsers(targetIds, adminId, result);

    case 'delete_users':
      return await bulkDeleteUsers(targetIds, adminId, result);

    case 'approve_listings':
      return await bulkApproveListings(targetIds, adminId, result);

    case 'reject_listings':
      return await bulkRejectListings(targetIds, adminId, reason, result);

    case 'delete_listings':
      return await bulkDeleteListings(targetIds, adminId, result);

    case 'cancel_bookings':
      return await bulkCancelBookings(targetIds, adminId, reason, result);

    case 'approve_verifications':
      return await bulkApproveVerifications(targetIds, adminId, result);

    case 'reject_verifications':
      return await bulkRejectVerifications(targetIds, adminId, reason, result);

    case 'send_notifications':
      return await bulkSendNotifications(targetIds, adminId, metadata, result);

    case 'update_subscription':
      return await bulkUpdateSubscription(targetIds, adminId, metadata, result);

    case 'add_badge':
      return await bulkAddBadge(targetIds, adminId, metadata, result);

    default:
      throw new Error(`Unknown bulk operation type: ${type}`);
  }
}

/**
 * Bulk suspend users
 */
async function bulkSuspendUsers(
  userIds: string[],
  adminId: string,
  reason: string = 'Suspended by admin',
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const userId of userIds) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: true,
          suspension_reason: reason,
        })
        .eq('id', userId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'UserSuspend',
        p_target_type: 'User',
        p_target_id: userId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: userId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk activate users
 */
async function bulkActivateUsers(
  userIds: string[],
  adminId: string,
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const userId of userIds) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: false,
          suspension_reason: null,
        })
        .eq('id', userId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'UserActivate',
        p_target_type: 'User',
        p_target_id: userId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: userId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk verify users
 */
async function bulkVerifyUsers(
  userIds: string[],
  adminId: string,
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const userId of userIds) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
        })
        .eq('id', userId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'VerificationApprove',
        p_target_type: 'User',
        p_target_id: userId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: userId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk delete users
 */
async function bulkDeleteUsers(
  userIds: string[],
  adminId: string,
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const userId of userIds) {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'ContentModeration',
        p_target_type: 'User',
        p_target_id: userId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: userId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk approve listings
 */
async function bulkApproveListings(
  listingIds: string[],
  adminId: string,
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const listingId of listingIds) {
    try {
      const { error } = await supabase
        .from('service_listings')
        .update({
          status: 'Active',
        })
        .eq('id', listingId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'ListingApprove',
        p_target_type: 'Listing',
        p_target_id: listingId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: listingId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk reject listings
 */
async function bulkRejectListings(
  listingIds: string[],
  adminId: string,
  reason: string = 'Rejected by admin',
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const listingId of listingIds) {
    try {
      const { error } = await supabase
        .from('service_listings')
        .update({
          status: 'Inactive',
        })
        .eq('id', listingId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'ListingReject',
        p_target_type: 'Listing',
        p_target_id: listingId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: listingId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk delete listings
 */
async function bulkDeleteListings(
  listingIds: string[],
  adminId: string,
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const listingId of listingIds) {
    try {
      const { error } = await supabase.from('service_listings').delete().eq('id', listingId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'ContentModeration',
        p_target_type: 'Listing',
        p_target_id: listingId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: listingId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk cancel bookings
 */
async function bulkCancelBookings(
  bookingIds: string[],
  adminId: string,
  reason: string = 'Cancelled by admin',
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const bookingId of bookingIds) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Cancelled',
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'BookingCancel',
        p_target_type: 'Booking',
        p_target_id: bookingId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: bookingId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk approve verifications
 */
async function bulkApproveVerifications(
  verificationIds: string[],
  adminId: string,
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const verificationId of verificationIds) {
    try {
      const { error } = await supabase
        .from('provider_verification_requests')
        .update({
          status: 'Approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', verificationId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'VerificationApprove',
        p_target_type: 'Verification',
        p_target_id: verificationId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: verificationId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk reject verifications
 */
async function bulkRejectVerifications(
  verificationIds: string[],
  adminId: string,
  reason: string = 'Rejected by admin',
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  for (const verificationId of verificationIds) {
    try {
      const { error } = await supabase
        .from('provider_verification_requests')
        .update({
          status: 'Rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
          rejection_reason: reason,
        })
        .eq('id', verificationId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'VerificationReject',
        p_target_type: 'Verification',
        p_target_id: verificationId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: verificationId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk send notifications
 */
async function bulkSendNotifications(
  userIds: string[],
  adminId: string,
  metadata: Record<string, any> = {},
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  const { title, message, type = 'System' } = metadata;

  if (!title || !message) {
    throw new Error('Notification title and message are required');
  }

  for (const userId of userIds) {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        data: { sent_by_admin: adminId },
      });

      if (error) throw error;

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: userId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk update subscription
 */
async function bulkUpdateSubscription(
  userIds: string[],
  adminId: string,
  metadata: Record<string, any> = {},
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  const { planId } = metadata;

  if (!planId) {
    throw new Error('Plan ID is required');
  }

  for (const userId of userIds) {
    try {
      // Check if user has active subscription
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'Active')
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .update({ plan_id: planId })
          .eq('id', existingSub.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase.from('user_subscriptions').insert({
          user_id: userId,
          plan_id: planId,
          status: 'Active',
          start_date: new Date().toISOString(),
        });

        if (error) throw error;
      }

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: 'ContentModeration',
        p_target_type: 'User',
        p_target_id: userId,
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: userId, error: error.message });
    }
  }

  return result;
}

/**
 * Bulk add badge
 */
async function bulkAddBadge(
  userIds: string[],
  adminId: string,
  metadata: Record<string, any> = {},
  result: BulkOperationResult
): Promise<BulkOperationResult> {
  const { badgeType, reason } = metadata;

  if (!badgeType) {
    throw new Error('Badge type is required');
  }

  for (const userId of userIds) {
    try {
      const { error } = await supabase.from('verification_badges').insert({
        user_id: userId,
        badge_type: badgeType,
        earned_at: new Date().toISOString(),
        criteria_met: { admin_granted: true, reason },
      });

      if (error) throw error;

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id: userId, error: error.message });
    }
  }

  return result;
}

/**
 * Get bulk operation summary message
 */
export function getBulkOperationSummary(result: BulkOperationResult): string {
  const { success, failed, total } = result;

  if (failed === 0) {
    return `✅ All ${total} operations completed successfully`;
  }

  if (success === 0) {
    return `❌ All ${total} operations failed`;
  }

  return `⚠️ ${success} of ${total} operations completed successfully. ${failed} failed.`;
}

/**
 * Quick bulk operation helpers
 */
export const bulkOperations = {
  suspendUsers: (userIds: string[], adminId: string, reason?: string) =>
    executeBulkOperation({ type: 'suspend_users', targetIds: userIds, adminId, reason }),

  activateUsers: (userIds: string[], adminId: string) =>
    executeBulkOperation({ type: 'activate_users', targetIds: userIds, adminId }),

  verifyUsers: (userIds: string[], adminId: string) =>
    executeBulkOperation({ type: 'verify_users', targetIds: userIds, adminId }),

  deleteUsers: (userIds: string[], adminId: string) =>
    executeBulkOperation({ type: 'delete_users', targetIds: userIds, adminId }),

  approveListings: (listingIds: string[], adminId: string) =>
    executeBulkOperation({ type: 'approve_listings', targetIds: listingIds, adminId }),

  rejectListings: (listingIds: string[], adminId: string, reason?: string) =>
    executeBulkOperation({ type: 'reject_listings', targetIds: listingIds, adminId, reason }),

  deleteListings: (listingIds: string[], adminId: string) =>
    executeBulkOperation({ type: 'delete_listings', targetIds: listingIds, adminId }),

  cancelBookings: (bookingIds: string[], adminId: string, reason?: string) =>
    executeBulkOperation({ type: 'cancel_bookings', targetIds: bookingIds, adminId, reason }),

  approveVerifications: (verificationIds: string[], adminId: string) =>
    executeBulkOperation({ type: 'approve_verifications', targetIds: verificationIds, adminId }),

  rejectVerifications: (verificationIds: string[], adminId: string, reason?: string) =>
    executeBulkOperation({
      type: 'reject_verifications',
      targetIds: verificationIds,
      adminId,
      reason,
    }),

  sendNotifications: (userIds: string[], adminId: string, title: string, message: string, type?: string) =>
    executeBulkOperation({
      type: 'send_notifications',
      targetIds: userIds,
      adminId,
      metadata: { title, message, type },
    }),

  updateSubscription: (userIds: string[], adminId: string, planId: string) =>
    executeBulkOperation({
      type: 'update_subscription',
      targetIds: userIds,
      adminId,
      metadata: { planId },
    }),

  addBadge: (userIds: string[], adminId: string, badgeType: string, reason?: string) =>
    executeBulkOperation({
      type: 'add_badge',
      targetIds: userIds,
      adminId,
      metadata: { badgeType, reason },
    }),
};
